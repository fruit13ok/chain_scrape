// REQUIREMENTS

// native
const path = require('path');
const https = require('https');

// 3rd party
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require("node-fetch");
const AbortController = require('abort-controller');
// random user info for frequent request / recaptcha
var userAgent = require('user-agents');

// local
const app = express();
const controller = new AbortController();
const port = process.env.PORT || 8000;

// [SOLUTION] to node-fetch problem, work together with abort request, and catch block,
// FetchError Hostname/IP does not match certificate's altnames ERR_TLS_CERT_ALTNAME_INVALID
// TypeError ERR_INVALID_PROTOCOL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = false;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const agent = new https.Agent({
    rejectUnauthorized: false,
    // keepAlive: true,
    // maxSockets: 100,
});

// MIDDLEWARE
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// allow cors to access this backend
app.use( (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// INIT SERVER
app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

// helper functions

// convert to start with https://
const tohttps = (url) => {
    let newurl;
    if(url.startsWith('https://www.')){
        newurl='https://'+url.slice(12);
    }else if(url.startsWith('https://')){
        newurl=url;
    }else if(url.startsWith('http://www.')){
        newurl='https://'+url.slice(11);
    }else if(url.startsWith('http://')){
        newurl='https://'+url.slice(7);
    }else if(url.startsWith('www.')){
        newurl='https://'+url.slice(4);
    }else{
        newurl='https://'+url;
    }
    // console.log(newurl);
    return newurl;
};

// return single promise result as array of objects
const urlLoop = async (urls) => {
    // wait for non-responsive url for at least 1 second, 
    // less than that could mistreat good url
    let waitTime = 10000;
    setTimeout(() => { controller.abort(); }, waitTime);
    // check URL status code return array of fetches promise
    let checkUrl = urls.map(url => fetch(tohttps(url), {
        signal: controller.signal,
        agent: agent
      })
      .then(function(response) {
        if (response.status.toString() == '999') {
            return {url: url, status: '999 not permit scanning'};
        }
        else {
            return {url: url, status: response.status.toString()};
        }
      })
      .catch(function(error) {
        if (error.name === 'AbortError') {
            // console.log('Got AbortError', url)
            return {url: url, status: "408 Request Timeout"};
        }
        else if (error.name === 'FetchError' && error.code === 'EPROTO'){
            // console.log('Got FetchError', url)
            return {url: url, status: "200 http only"};
        }
        else if (error.name === 'FetchError' && error.code === 'ECONNRESET'){
            // console.log('Got FetchError', url)
            return {url: url, status: "408 Connection Reset"};
        }
        else if (error.name === 'FetchError' && error.code === 'ECONNREFUSED'){
            // console.log('Got FetchError', url)
            return {url: url, status: "503 Service Unavailable"};
        }
        else if (error.name === 'FetchError' && error.code === 'ENOTFOUND'){
            // console.log('Got FetchError', url)
            return {url: url, status: "404 Not Found"};
        }
        else if (error.name === 'TypeError' || error.name === 'TypeError [ERR_INVALID_PROTOCOL]'){
            // console.log('Got TypeError', url)
            return {url: url, status: "200"};
        }
        else {
            console.log("my error:",error);
            // console.log("my url:",url);
            throw error;
        }
      })
    );
    // loop over array of all promises resolves them, 
    // return single promise as array result
    let results = await Promise.all(checkUrl);
    return results;
};

// number of scrape depends on a search list of keys,
// number of search append to search list is hardcoded here,
// (refactor when have time) 
// 2 level depth search 9 times: original key + 8 results,
// 3 level depth means scrape around 580 times, 
// about 4470 results (with duplicate), takes 5.5+ minutes,
// my spec 68.8 Mbps down, 38.9 Mbps up, 2.3 GHz Intel Core i5, 8 GB 2133 MHz LPDDR3
// http request will end before it is done
let setNumOfSearchAppend = (searchDepth) => {
    if(searchDepth == 0){
        // Search only input (1)
        return 0;
    }else if(searchDepth == 1){
        // Search input and its result (1+8)
        return 1;
    }else if(searchDepth == 2){
        // Search input, its result, and result's result (1+8+64)
        return 9;
    }else if(searchDepth == 3){
        // Search input, 3 level deep of result (1+8+64+512)
        return 73;
    }else if(searchDepth == 4){
        // Search input, 4 level deep of result (1+8+64+512+4096)
        return 585;
    }
};

// format the response object for frontend
// return array of object with searchKey and count, base on final array of search result
let wordCountObj = (arrStrs) => {
    let arrObjs = [];
    let wordObj = {};
    arrStrs.forEach((word)=>{
        wordObj[word] ? wordObj[word]+=1 : wordObj[word]=1;
    });
    for (var pro in wordObj) {
        arrObjs.push({'searchKey': pro, 'count': wordObj[pro]});
    }
    arrObjs.sort((a,b)=>{
        return (a.searchKey > b.searchKey ? 1 : -1);
    });
    return arrObjs;
};

// check URL status code
let checkUrl = async (url) => {
    try {
        const response = await fetch(url);
        const status = await response.status;
        return status.toString();
    }catch (error) {
        console.log(error);
        // return error;
        return "598";
    }
};

// return result array of objects
let forLoop = async (resultArr) => {
    let resultArray = [];
    for (let i = 0; i < resultArr.length; i++) {
        let curUrl = resultArr[i];
        let curStatus = await checkUrl(curUrl);
        resultArray.push({url: curUrl, status: curStatus});
    }
    return resultArray;
}
// return links from current page, use in a loop to accumulate all page links
// fix short for result problem, 
// by convert for loop to async function to wait
const forLoop2 = async (sResults) => {
    var tempArr=[];
    for (let result of sResults) {
        let url = await (await result.getProperty('href')).jsonValue();
        console.log(url);
        // urls.push(url);
        tempArr.push(url);
    }
    return tempArr;
}

// as alternative to addUniqueResult() remove duuplicate at the end
let removeDuplicateResult = (allResult) => {
    const seen = new Set();
    const filteredArr = allResult.filter(el => {
        const duplicate = seen.has(el.url);
        seen.add(el.url);
        return !duplicate;
    });
    return filteredArr;
}

// scrape and post, later need to break them into their own files

// the puppeteer filter doesn't work
let scrape = async (searchWord) => {
    const blockedResourceTypes = ['image','media','font','stylesheet'];
    // const browser = await puppeteer.launch({ headless: false });
    // const browser = await puppeteer.launch({ devtools: true });
    // const browser = await puppeteer.launch();
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();

    // await page.setViewport({ width: 1920, height: 1080 });
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //     if(blockedResourceTypes.indexOf(req.resourceType()) !== -1){
    //         req.abort();
    //     }
    //     else {
    //         req.continue();
    //     }
    // });

    await page.goto(`https://www.google.com/search?&q=${searchWord}`);
    // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    // await page.waitFor(1000);
    const result = await page.evaluate(() => {
        let movieList = [];
        let elements = document.querySelectorAll('.nVcaUb');
        for (var element of elements){
            let temp = element.childNodes[0].textContent;
            if(temp != "undefined"){
                movieList.push(temp);
            }
        }
        return movieList;
    });
    // await page.waitFor(1000);
    await page.close();
    await browser.close();
    return result;
};

// ROUTES
// root
app.get('/', function (req, res) {
    res.send('hello world');
});

// post, get form data from frontend, invoke scrape function in a while loop of search list,
// search depth determine how many time search results push into search list as search keys,
// return array of object with searchKey and count to frontend
app.post('/api', async function (req, res) {
    // req.setTimeout(500000);
    req.setTimeout(0);
    let numOfLoop = 0;
    let existIndex = -1;
    let curSearchKey = req.body.searchKey;
    console.log(curSearchKey);
    let uniqueSetListObj = [];
    let curSearchResults = [];
    let existSearchResults = [];
    let searchList = [curSearchKey];
    let searchDepth = req.body.searchDepth;
    let numOfSearchAppend = setNumOfSearchAppend(searchDepth);
    let resultList = [curSearchKey];
    console.log('list start: ',searchList);
    let rawDataOrCount = req.body.rawDataOrCount;
    let tryLoop = async () => {
        while (searchList.length) {
            curSearchKey = searchList[0];
            existIndex = uniqueSetListObj.findIndex((obj)=>obj.searchKey == curSearchKey);
            if(existIndex == -1){
                await scrape(curSearchKey)
                .then((newSearchList) => {
                    curSearchResults = [...newSearchList];
                    // append to searchList
                    if(numOfSearchAppend > 0){
                        searchList = [...searchList,...curSearchResults];
                        uniqueSetListObj.push({searchKey: curSearchKey, searchResults: curSearchResults});
                        // console.log('added unique key');
                        numOfSearchAppend--;
                    }
                    resultList = [...resultList,...curSearchResults];
                })
                .then(() => {
                    // console.log('list during update: ',searchList.length);
                }).catch(() => {})
            }else{
                // console.log('it is a duplicate key');
                existSearchResults = [...uniqueSetListObj[existIndex].searchResults];
                if(numOfSearchAppend > 0){
                    searchList = [...searchList,...existSearchResults];
                    numOfSearchAppend--;
                }
                resultList = [...resultList,...existSearchResults];
            }
            searchList.shift();
            numOfLoop++;
            // console.log(numOfLoop);
        }
        return resultList;
    }
    tryLoop()
    .then((rlist) => {
        console.log('list end: ', rlist);
        // now on html, I am not using raw result, only using count result
        // if(rawDataOrCount === 'raw'){
        //     rlist.sort((a,b)=>{
        //         let resultA = a.toUpperCase();
        //         let resultB = b.toUpperCase();
        //         if (resultA < resultB) {
        //             return -1;
        //         }
        //         if (resultA > resultB) {
        //             return 1;
        //         }
        //         return 0;
        //     });
        //     res.status(200).send(rlist);
        // }else{
            res.status(200).send(wordCountObj(rlist));
        // }
    });
})

let scrape2 = async (targetPage, searchKeys) => {
    // const browser = await puppeteer.launch({ headless: false });
    // const browser = await puppeteer.launch({ devtools: true });
    // const browser = await puppeteer.launch();
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false']});
    const page = await browser.newPage();
    if(targetPage.startsWith('https://www.')){
        console.log('https://www.');
    }else if(targetPage.startsWith('http://www.')){
        console.log('http://www.');
        targetPage='https://www.'+targetPage.slice(11);
    }else if(targetPage.startsWith('www.')){
        console.log('www.');
        targetPage='https://'+targetPage;
    }else{
        targetPage='https://www.'+targetPage;
    }
    await page.goto(targetPage);
    // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    // await page.waitForNavigation({ waitUntil: 'networkidle2' });
    // await page.waitFor(10000);

    // RegExp need to improve later for a better match
    // this get all innertext of the page as single string might not have space
    const text = await page.$eval('*', el => el.innerText);
    console.log('text: ', text);
    let resultArr = [];
    for(let searchKey of searchKeys){
        let regex = new RegExp( searchKey, 'gi' );
        let found = text.match(regex) || [];    // if null set to empty array
        let count = found.length;
        // let count = (text.match(/\scoffee\s/gi)).length;
        resultArr.push({'searchKey': searchKey, 'count': count});
    }
    console.log(resultArr);
    await page.close();
	await browser.close();
    return resultArr;
    // this return all links
    // const hrefs = await page.$$eval('a', as => as.map(a => a.href));
    // console.log('hrefs: ',hrefs);
};

app.post('/api2', async function (req, res) {
    // req.setTimeout(500000);
    req.setTimeout(0);
    let targetPage = req.body.targetPage;
    let searchKeys = req.body.searchKeys;
    console.log(searchKeys);
    searchKeys = searchKeys.split(",");
    // searchKeys = ["GIFT CARDS"];
    await scrape2(targetPage, searchKeys)
    .then((resultArr)=>{
        res.status(200).send(resultArr);
    }).catch(() => {});
    // let getAllLinks = async () => {
    //     // while
    //     //  scrape
    // }
    // getAllLinks()
    // .then((rlist) => {
    //     console.log('list end: ', rlist);
    //     res.status(200).send(rlist);
    // });
});


let scrape3 = async (searchWord) => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.goto(`https://www.google.com/search?&q=${searchWord}`);

    const result = await page.evaluate(() => {
        let movieList = [];
        let elements = document.querySelectorAll('.nVcaUb');
        for (var element of elements){
            let temp = element.childNodes[0].textContent;
            if(temp != "undefined"){
                movieList.push(temp);
            }
        }
        return movieList;
    });
    await page.close();
    await browser.close();
    return result;
};

app.post('/api3', async function (req, res) {
    let curSearchKey1 = req.body.searchKey1 || "";
    let curSearchKey2 = req.body.searchKey2 || "";
    let curSearchKey3 = req.body.searchKey3 || "";
    let curSearchKeys = [curSearchKey1, curSearchKey2, curSearchKey3]
    searchResults1 = [curSearchKey1];
    searchResults2 = [curSearchKey2];
    searchResults3 = [curSearchKey3];
    console.log("3 search keys: ", curSearchKeys);
    let resultList = [];
    let tryLoop = async () => {
        for(let i = 0; i < 3; i++){
            await scrape3(curSearchKeys[i])
            .then((rlist) => {
                resultList = [...resultList, {key: curSearchKeys[i], value: rlist}];
            })
        }
        return resultList;
    }
    await tryLoop()
    .then((rlist) => {
        res.status(200).send(rlist);
    });
});

// scrape for all "a" tag's "href" content of given page
// standard the page
let scrape4 = async (targetPage) => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false']});
    const page = await browser.newPage();
    if(targetPage.startsWith('https://www.')){
        console.log('https://www.');
    }else if(targetPage.startsWith('http://www.')){
        console.log('http://www.');
        targetPage='https://www.'+targetPage.slice(11);
    }else if(targetPage.startsWith('www.')){
        console.log('www.');
        targetPage='https://'+targetPage;
    }else{
        targetPage='https://www.'+targetPage;
    }
    // await page.goto(targetPage);
    await page.goto(targetPage, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });

    //either of these 3 ways return all links
    const hrefs = await page.$$eval('a', as => as.map(a => a.href));
    // const hrefs = await page.evaluate(() => {
    //     return Array.from(document.getElementsByTagName('a'), a => a.href);
    // });
    // const hrefs = await Promise.all((await page.$$('a')).map(async a => {
    //     return await (await a.getProperty('href')).jsonValue();
    // }));
    console.log('hrefs: ',hrefs.length, hrefs);
    return hrefs;
};

app.post('/api4', async function (req, res) {
    req.setTimeout(0);
    let targetPage = req.body.targetPage || "";
    await scrape4(targetPage)
    .then((resultArr)=>{
        forLoop(resultArr)
        .then(resultArray => {
            res.send(resultArray);
        })
    }).catch(() => {});    
});

// old version
// let scrape5 = async (searchKey, startResultNum) => {
//     const blockedResourceTypes = ['image','media','font','stylesheet'];
//     let BASE_URL = `https://www.google.com/search?q=${searchKey}&tbs=li:1&start=${startResultNum}`;
//     // let BASE_URL = `https://www.google.com/search?q=${searchKey}&start=${startResultNum}`;
//     // let BASE_URL = `https://www.google.com/search?q=${searchKey}&tbs=li:1&num=100`;
//     // const browser = await puppeteer.launch({args: ['--proxy-server=50.235.149.74:8080', '--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false']});
//     const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false']});
//     // const browser = await puppeteer.launch({ headless: false, args: ['--proxy-server=50.235.149.74:8080'] });
//     // const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();
//     // to bypass recaptcha use "user-agents" to generate random userAgent on each scrape
//     await page.setUserAgent(userAgent.random().toString());
//     await page.setRequestInterception(true);
//     page.on('request', (request) => {
//         if(blockedResourceTypes.indexOf(request.resourceType()) !== -1){
//             request.abort();
//         }
//         else {
//             request.continue();
//         }
//     });
//     await page.goto(BASE_URL, {
//         waitUntil: 'networkidle2',
//     });
//     //
//     const result = await page.evaluate(() => {
//         let aList = [];
//         let elements = document.querySelectorAll('#rso > .g > .rc > .r > a');
//         // console.log("elements: ",elements);
//         for (var element of elements){
//             console.log("element: ", element.href);
//             aList.push(element.href);
//         }
//         return aList;
//     });
//     // close when is done
//     await browser.close();
//     return result;
// };
let scrape5 = async (searchKey) => {
    const blockedResourceTypes = ['image','media','font','stylesheet'];
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false'], slowMo: 100});
    // const browser = await puppeteer.launch({headless: false, slowMo: 100});
    // const browser = await puppeteer.launch({slowMo: 100}); // need to slow down to content load

    const page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    const navigationPromise =  page.waitForNavigation();
    
    await page.setUserAgent(userAgent.random().toString());

    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if(blockedResourceTypes.indexOf(request.resourceType()) !== -1){
            request.abort();
        }
        else {
            request.continue();
        }
    });

    await page.goto('https://www.google.com/');
    await navigationPromise;
    await page.type('input[title="Search"]', searchKey, { delay: 50 });
    await page.keyboard.press('Enter');
    await navigationPromise;

    await page.waitForSelector('a#hdtb-tls');
    await page.click('a#hdtb-tls');
    await page.waitForSelector('[aria-label="All results"]');
    await page.click('[aria-label="All results"]');
    await page.waitForSelector('ul > li#li_1');
    await page.click('ul > li#li_1');
    await navigationPromise;

    let urls = [];
    let hasNext = true
    while(hasNext) {
      const searchResults = await page.$$('#rso > .g > .rc > .r > a');
      // need to convert for loop to async function to wait
      urls.push(...await forLoop(searchResults));
      let nextLink = await page.$('a[id="pnnext"]');
      if (nextLink !== null) {
          await nextLink.click();
          await page.waitForNavigation();
      } else {
          hasNext = false;
      }
    }
    await browser.close();
    return urls;
};

// old version
// app.post('/api5', async function (req, res) {
//     req.setTimeout(0);
//     // let searchKey = req.body.targetPage2 || "";
//     let searchKey = req.body.targetPage2;
//     let startResultNumber = 0;
//     //
//     let result = [{ url: '', status: '' }];
//     let allResult = [];
//     let tryLoop = async () => {
//         while (result.length) {
//             //
//             await scrape5(searchKey, startResultNumber)
//             .then((resultArr)=>{
//                 forLoop(resultArr)
//                 .then(resultArray => {
//                     // append to all result
//                     console.log("resultArray", resultArray);
//                     allResult = [...allResult,...resultArray];
//                     // loop control
//                     result = [...resultArray];
//                     // result = []; // test loop once
//                     startResultNumber=startResultNumber+10;
//                 })
//             }).catch(() => {});
//         }
//         return allResult;
//     }
//     tryLoop()
//     .then((rlist) => {
//         console.log('list end: ', rlist);
//         res.send(removeDuplicateResult(rlist));
//     });
// });
app.post('/api5', async function (req, res) {
    req.setTimeout(0);
    let searchKey = req.body.targetPage2 || "";
    const urls = await scrape5(searchKey);
    // console.log(urls);
    // res.send(urls);
    urlLoop(urls)
    .then((resultArray) => {
        // console.log(resultArray);
        // res.send(resultArray);
        res.send(removeDuplicateResult(resultArray));
    })
    .catch((err)=>{
        console.error(err)
    });
});