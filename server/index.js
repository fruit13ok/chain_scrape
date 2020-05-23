// REQUIREMENTS
// native
const path = require('path');
// 3rd party
const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fetch = require("node-fetch");

// local
const app = express();
const port = process.env.PORT || 8000;

// MIDDLEWARE
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));
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
        if(rawDataOrCount === 'raw'){
            rlist.sort((a,b)=>{
                let resultA = a.toUpperCase();
                let resultB = b.toUpperCase();
                if (resultA < resultB) {
                    return -1;
                }
                if (resultA > resultB) {
                    return 1;
                }
                return 0;
            });
            res.status(200).send(rlist);
        }else{
            res.status(200).send(wordCountObj(rlist));
        }
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