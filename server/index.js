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
const Sitemapper = require('sitemapper');
const sitemap = new Sitemapper();

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

// need Json result to be single level deep, change "businesshours" to "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let formatBusinesshours = (businesshours) => {
    let newdays = {"Sunday": "", "Monday": "","Tuesday": "","Wednesday": "","Thursday": "","Friday": "","Saturday": ""};
    for (let i=0; i<businesshours.length; i++){
        if(days.includes(businesshours[i].day)){
        newdays[businesshours[i].day]=businesshours[i].hours.trim();
        }
    }
    return newdays;
};

function renInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

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
    let waitTime = 5000;
    setTimeout(() => { controller.abort(); }, waitTime);
    // check URL status code return array of fetches promise
    // let checkUrl = urls.map(url => fetch(tohttps(url), {
    //     signal: controller.signal,
    //     agent: agent
    //   })
    let checkUrl = urls.map(e => {
        return fetch(tohttps(e.url), {
            signal: controller.signal,
            agent: agent
        })
        .then(function(response) {
            if (response.status.toString() == '999') {
                return {url: e.url, status: '999 not permit scanning', anchorText: e.aText};
            }
            else {
                return {url: e.url, status: response.status.toString(), anchorText: e.aText};
            }
        })
        .catch(function(error) {
            if (error.name === 'AbortError') {
                // console.log('Got AbortError', e.url);
                return {url: e.url, status: "408 Request Timeout", anchorText: e.aText};
            }
            else if (error.name === 'FetchError' && error.code === 'EPROTO'){
                // console.log('Got FetchError', e.url);
                return {url: e.url, status: "200 http only", anchorText: e.aText};
            }
            else if (error.name === 'FetchError' && error.code === 'ECONNRESET'){
                // console.log('Got FetchError', e.url);
                return {url: e.url, status: "408 Connection Reset", anchorText: e.aText};
            }
            else if (error.name === 'FetchError' && error.code === 'ECONNREFUSED'){
                // console.log('Got FetchError', e.url);
                return {url: e.url, status: "503 Service Unavailable", anchorText: e.aText};
            }
            else if (error.name === 'FetchError' && error.code === 'ENOTFOUND'){
                // console.log('Got FetchError', e.url);
                return {url: e.url, status: "404 Not Found", anchorText: e.aText};
            }
            else if (error.name === 'TypeError' || error.name === 'TypeError [ERR_INVALID_PROTOCOL]'){
                // console.log('Got TypeError', e.url);
                return {url: e.url, status: "200", anchorText: e.aText};
            }
            else {  // new future unidentify error
                console.log("my error:",error);
                // console.log("my url:",e.url);
                throw error;
            }
        })
    });
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
// sort by most count first
// insert 2 properties to an array of objects, totalCount, and percentage
let wordCountObj = (arrStrs) => {
    let totalCount = 0;
    let arrObjs = [];
    let wordObj = {};
    arrStrs.forEach((word)=>{
        wordObj[word] ? wordObj[word]+=1 : wordObj[word]=1;
    });
    for (var pro in wordObj) {
        totalCount += wordObj[pro];
        arrObjs.push({'searchKey': pro, 'count': wordObj[pro]});
    }
    arrObjs.sort((a,b)=>{
        // return (a.searchKey > b.searchKey ? 1 : -1);
        return (a.count < b.count ? 1 : -1);
    });
    arrObjs.forEach((obj)=>{
        obj.percentage = (obj.count / totalCount * 100).toFixed(2);
        obj.totalCount = totalCount;
    });
    return arrObjs;
};

// filter out result with 1 count
let filterSingle = (unFilArrObjs) => {
    let filteredAO = unFilArrObjs.filter((obj)=>{
        return (obj.count > 1)
    });
    return filteredAO;
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
        let aText = await result.$eval('h3', i => i.innerText);
        console.log(url);
        console.log(aText);
        // urls.push(url);
        tempArr.push({url: url, aText: aText});
    }
    return tempArr;
}

// after search, on current page, click to each result, scrape that result page, go back to previous page, return results
const loopClickCompResult = async (page, navigationPromise) => {
    // companies on current page
    var curPageCompanies = [];
    // company data keys
    var matchAddress = '';
    var matchPhoneNumber = '';
    var matchWebsites = [];
    var matchWebsite = '';
    var logo = '';
    var category = '';
    var name = '';
    var shareBtn = null;
    var mapID = '';
    var closeBtn = null;
    var divTexts = '';
    var address = '';
    var city = '';
    var stateZip = '';
    var state = '';
    var zip = '';
    var phonenumber = '';
    var website = '';
    var dropdownListBtn = null;
    var businesshours = [];
    var tmpBHours = [];
    var companyJson = {};
    // regular expression for full address
    const regexAddress = /\d+ \d*\w+ \w+.*, \w+, \w+ \d+/g;
    // regular expression for domain name
    const regexDomainName = /(https?:\/\/)?(www\.)?([\w\d]+)\.([\w]+)(\.[\w]+)?(\/[^ ]*)?/g;
    // regular expression for phone number
    const regexPhoneNum = /((\d)\D)?(\(?(\d\d\d)\)?)?\D(\d\d\d)\D(\d\d\d\d)/g;

    // need to reevaluate number of results, sometime will keep using firsttime result, I applied backup plan
    await page.waitForSelector('div.section-result-content');
    var numOfCurResult = Array.from(await page.$$('div.section-result-content')).length;
    await page.waitForTimeout(renInt(500, 600));
    console.log("# of results this page: ", numOfCurResult);

    // click to each result, scrape that result page, go back to previous page
    for(var i=0; i<numOfCurResult; i++){
    // for(var i=0; i<3; i++){
        await page.waitForSelector('div.section-result-content'); 
        var arrOfElements = await page.$$('div.section-result-content');
        await page.waitForTimeout(renInt(500, 600));
        // when console log show i but not each content, it is ok,
        // that mean it didn't count the current page result size
        console.log(i);
        // my backup plan, check for undefined / null index
        if(Array.from(arrOfElements)[i]){
            await Array.from(arrOfElements)[i].click(); 
            await navigationPromise;
            await page.waitForTimeout(renInt(500, 600));

            await page.waitForSelector('.section-hero-header-image-hero-container.collapsible-hero-image img');
            logo = await page.evaluate((selector) => {
                let el = document.querySelector(selector);
                return el ? el.getAttribute('src').replace('//', '') : "image error";
            }, '.section-hero-header-image-hero-container.collapsible-hero-image img');
            await page.waitForTimeout(renInt(500, 600));

            await page.waitForSelector('div.section-hero-header-title-description');
            category = await page.evaluate((selector) => {
                let el = document.querySelector(selector);
                return el ? el.innerText.split(/\r?\n/).pop() : "category error";
            }, 'div.section-hero-header-title-description');
            await page.waitForTimeout(renInt(500, 600));

            await page.waitForSelector('.section-hero-header-title-title');
            name = await page.evaluate((selector) => {
                let el = document.querySelector(selector);
                return el ? el.innerText.replace(/,/g, '') : "name error";
            }, '.section-hero-header-title-title');
            await page.waitForTimeout(renInt(500, 600));

            try {
                await page.waitForXPath("//div[contains(text(), 'Share')]", { timeout: 5000 }); // default 30000
                const shareBtn = await page.$x("//div[contains(text(), 'Share')]");
                console.log('test');
                await shareBtn[0].click(); // try to use click as hover
                await navigationPromise;
                await page.waitForTimeout(renInt(500, 600));

                await page.waitForSelector('input.section-copy-link-input');
                mapID = await page.evaluate((selector) => {
                    let el = document.querySelector(selector);
                    return el ? el.value : "no mapID error";
                }, 'input.section-copy-link-input');
                await page.waitForTimeout(renInt(500, 600));
                await page.waitForSelector('button[aria-label="Close"]');
                closeBtn = await page.$('button[aria-label="Close"]');
                await page.waitForTimeout(renInt(500, 600));
                if(closeBtn){
                    await closeBtn.click();
                    await navigationPromise;
                    await page.waitForTimeout(renInt(2000, 3000));
                }
            } catch(error) {
                console.log("Error, no Share link");
            }
            await page.waitForTimeout(renInt(500, 600));

            // array of string company data, array size will differ by differ company
            // I use regex to parse data
            await page.waitForSelector('.ugiz4pqJLAG__primary-text.gm2-body-2');
            
            divTexts = await page.evaluate((selector) => {
                let els = Array.from(document.querySelectorAll(selector));
                return els ? els.map(el => el.innerText) : "divTexts error";
            }, '.ugiz4pqJLAG__primary-text.gm2-body-2');
            await page.waitForTimeout(renInt(500, 600));
            if(divTexts != "divTexts error"){
                console.log(divTexts);
                matchAddress = divTexts.filter(word => word.match(regexAddress))[0];
                if(matchAddress){
                    address = matchAddress.replace(/,/g, '');
                }
                matchWebsites = divTexts.filter(word => word.match(regexDomainName));
                // some content had multiple urls, last one looks better
                matchWebsite = matchWebsites[matchWebsites.length - 1];
                if(matchWebsite){
                    website = matchWebsite;
                }
                matchPhoneNumber = divTexts.filter(word => word.match(regexPhoneNum))[0];
                if(matchPhoneNumber){
                    phonenumber = matchPhoneNumber;
                }
            }
            await page.waitForTimeout(renInt(500, 600));
            
            // document.querySelector('.section-open-hours-button').click();
            // document.querySelector('.section-open-hours-container').innerText;
            try {
                await page.waitForSelector('.section-open-hours-button', { timeout: 5000 }); // default 30000
                dropdownListBtn = await page.$('.section-open-hours-button');
                await page.waitForTimeout(renInt(500, 600));
                if(dropdownListBtn){
                    await dropdownListBtn.click();
                    await navigationPromise;
                    await page.waitForTimeout(renInt(2000, 3000));
                }
                await page.waitForSelector('.section-open-hours-container');
                tmpBHours = await page.evaluate((selector) => {
                    let el = document.querySelector(selector);
                    return el ? el.innerText : "no businesshours error";
                }, '.section-open-hours-container');
                await page.waitForTimeout(renInt(500, 600));
                if(tmpBHours != "businesshours error"){
                    var hoursArr = tmpBHours.replace(/\s/g, ' ').split(' ').filter(e=>e!="");
                    var curDay = {};
                    for (let i=0; i<hoursArr.length; i++){
                        if(days.includes(hoursArr[i])){
                            if(i!=0){
                                businesshours.push(curDay);
                                curDay = {};
                            }
                            curDay.day = hoursArr[i];
                            curDay.hours = "";
                        }else{
                            curDay.hours += hoursArr[i]+" ";
                        }
                        if(i==hoursArr.length-1){
                            businesshours.push(curDay);
                            curDay = {};
                        }
                    }
                    const sorter = {"Sunday": 0, "Monday": 1,"Tuesday": 2,"Wednesday": 3,"Thursday": 4,"Friday": 5,"Saturday": 6};
                    businesshours.sort((a, b)=> sorter[a.day]-sorter[b.day]);
                    console.log(businesshours);
                }
            } catch(error) {
                console.log("Error, no business hour");
            }

            // company data formet
            companyJson = {name: name, category: category, address: address, phonenumber: phonenumber, website: website, logo: logo, mapID: mapID, ...formatBusinesshours(businesshours)};
            curPageCompanies.push(companyJson);
            businesshours = [];

            // go back a page
            // await page.waitForSelector('button.section-back-to-list-button'); 
            await page.waitForTimeout(renInt(500, 600));
            var backToResults = await page.$('button.section-back-to-list-button');
            await page.waitForTimeout(renInt(500, 600));
            if(backToResults !== null){
                await backToResults.click();
                await navigationPromise;
                await page.waitForTimeout(renInt(1000, 2000));
            }
            // await backToResults.click(); 
            // await page.goBack();     // don't use page.goBack(), instead select the back button and click it
            // await navigationPromise;
            // await page.waitForTimeout(renInt(1000, 2000));
        }
    }
    return curPageCompanies;
};

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
let removeDuplicateResult2 = (allResult) => {
    const seen = new Set();
    const filteredArr = allResult.filter(el => {
        const duplicate = seen.has(el.website);
        seen.add(el.website);
        return !duplicate;
    });
    return filteredArr;
}

//
const loopUrlsForH1H2 = async (page, navigationPromise, urls) => {
    let resultArray = [];
    let response = null;
    let numOfH1 = 0;
    let numOfH2 = 0;
    let curUrl = '';
    for (let i = 0; i < urls.length; i++) {
        curUrl = urls[i];
        response = await page.goto(curUrl, { timeout: 10000, waitUntil: 'load' });
        await navigationPromise;
        await page.waitForTimeout(renInt(1000, 2000));
        numOfH1 = await page.evaluate((selector) => {
            let els = Array.from(document.querySelectorAll(selector));
            return els ? els.length : "h1 error";
        }, 'h1');
        await page.waitForTimeout(renInt(500, 600));
        numOfH2 = await page.evaluate((selector) => {
            let els = Array.from(document.querySelectorAll(selector));
            return els ? els.length : "h2 error";
        }, 'h2');
        await page.waitForTimeout(renInt(500, 600));
        console.log({url: curUrl, numOfH1: numOfH1, numOfH2: numOfH2, status: response._status});
        resultArray.push({url: curUrl, numOfH1: numOfH1, numOfH2: numOfH2, status: response._status});
    }
    return resultArray;
}

// scrape and post, later need to break them into their own files

// the puppeteer filter doesn't work
let scrape = async (searchWord) => {
    const blockedResourceTypes = ['image','media','font','stylesheet'];
    // const browser = await puppeteer.launch({ headless: false, devtools: true });
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

    const navigationPromise =  page.waitForNavigation();

    await page.goto(`https://www.google.com/search?&q=${searchWord}`);
    // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    // await page.waitFor(1000);
    await navigationPromise;
    const results = await page.evaluate(() => {
        let RETexts = [];
        let ResultElements = document.querySelectorAll('.nVcaUb');
        for (var ResultElement of ResultElements){
            let REText = ResultElement.childNodes[0].textContent;
            if(REText != "undefined"){
                RETexts.push(REText);
            }
        }
        return RETexts;
    });
    // await page.waitFor(1000);
    await page.close();
    await browser.close();
    console.log("done scraping");
    return results;
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
            // res.status(200).send(filterSingle(wordCountObj(rlist)));
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
    console.log("done scraping");
    return resultArr;
    // this return all links
    // const hrefs = await page.$$eval('a', as => as.map(a => a.href));
    // console.log('hrefs: ',hrefs);
};

app.post('/api2', async function (req, res) {
    // req.setTimeout(500000);
    req.setTimeout(0);
    let targetPage = req.body.targetPage0;
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
    console.log("done scraping");
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
    let hrefs = [];
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
    hrefs = await page.$$eval('a', as => as.map(a => a.href));
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
    let targetPage = req.body.targetPage1 || "";
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
//     await page.close();
//     await browser.close();
//     return result;
// };
let scrape5 = async (searchKey) => {
    const blockedResourceTypes = ['image','media','font','stylesheet'];
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], slowMo: 100});
    // const browser = await puppeteer.launch({headless: false, slowMo: 100}); // need to slow down to content load

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

    await page.waitForTimeout(renInt(500, 600));
    await page.waitForSelector('#hdtb-tls');

    await page.click('#hdtb-tls');
    await navigationPromise;
    // google updated their code no longer click on dropdown list by label
    // await page.waitForSelector('[aria-label="All results"]');
    // await page.click('[aria-label="All results"]');
    // new way to select and click on dropdown list, by xpath
    // select in chrome with $x("//div[contains(text(), 'All results')]")
    await page.waitForTimeout(renInt(500, 600));
    const elements = await page.$x("//div[contains(text(), 'All results')]");
    await elements[0].click();
    // await page.waitForSelector('ul > li#li_1');
    // await page.click('ul > li#li_1');
    await page.waitForTimeout(renInt(500, 600));
    const elemVerbatim = await page.$x("//a[contains(text(), 'Verbatim')]");
    await elemVerbatim[0].click();
    await navigationPromise;
    await page.waitForTimeout(renInt(500, 600));

    let pageNum = 0;
    let urls = [];
    let hasNext = true
    while(hasNext) {
        console.log(pageNum);
        pageNum++;
        // google updated their code no longer select DOM like this
        // const arrOfElements = await page.$$('#rso > .g > .rc > .r > a');
        const arrOfElements = await page.$$('div.yuRUbf > a');
        await page.waitForTimeout(renInt(500, 600));
        // const arrOfElements = await page.$$('#rso > .g > .rc .yuRUbf > a');
        // need to convert for loop to async function to wait
        // urls.push(...await forLoop(arrOfElements));  // old just array of url
        // urls.push(...await (await forLoop(arrOfElements)).map(result=>result.url));  // ugly
        const arrObj = await forLoop2(arrOfElements);
        await page.waitForTimeout(renInt(500, 600));
        // const arrUrl = await arrObj.map(result=>result.url);
        // await urls.push(...arrUrl);
        await urls.push(...arrObj);
        await page.waitForTimeout(renInt(500, 600));
        let nextLink = await page.$('a[id="pnnext"]');
        if (nextLink !== null) {
            await nextLink.click();
            await page.waitForNavigation();
            await page.waitForTimeout(renInt(1000, 2000));
        } else {
            hasNext = false;
        }
    }
    console.log("done scraping");
    await page.close();
    await browser.close();
    console.log("done scraping");
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
    // req.setTimeout(0);
    // let searchKey = req.body.targetPage2 || "";
    // const urls = await scrape5(searchKey);
    // // console.log(urls);
    // // res.send(urls);
    // urlLoop(urls)
    // .then((resultArray) => {
    //     // console.log(resultArray);
    //     // res.send(resultArray);
    //     res.send(removeDuplicateResult(resultArray));
    // })
    // .catch((err)=>{
    //     console.error(err);
    //     res.status(200).send({error: 'TimeoutError', solution: 'refresh, try again'});
    // });
    //
    req.setTimeout(0);
    let searchKey = req.body.targetPage2 || "";
    try{
        const urls = await scrape5(searchKey);
        urlLoop(urls)
        .then((resultArray) => {
            // console.log(resultArray);
            // res.send(resultArray);
            res.status(200).send(removeDuplicateResult(resultArray));
        })
        .catch((err)=>{
            console.error(err);
            res.status(200).send({error: 'TimeoutError', solution: 'refresh, try again'});
        });
        // res.status(200).send(removeDuplicateResult2(companies));
        // res.status(200).send(urls);
    }catch(err){
        console.error(err)
        res.status(200).send({error: 'TimeoutError', solution: 'refresh, try again'});
    }
});

let scrape6 = async (searchKey) => {
    // don't blocked resource types to improve speed, google maps needs most of them to work
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: true , slowMo: 100}); // need for real server, need image for map, so no '--blink-settings=imagesEnabled=false'
    // var browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true, slowMo: 100});

    var page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    var navigationPromise =  page.waitForNavigation();

    await page.setUserAgent(userAgent.random().toString());
    await page.setDefaultNavigationTimeout(0);
    await page.goto('https://www.google.com/maps/', { timeout: 10000, waitUntil: 'networkidle2', });
    await navigationPromise;
    await page.waitForTimeout(renInt(5000, 6000));
    await page.type('input#searchboxinput', searchKey, { delay: 100 });
    // await page.type('input[title="Search"]', searchKey);
    await page.keyboard.press('Enter');
    await navigationPromise;
    await page.waitForTimeout(renInt(5000, 6000));

    
    // var address, city, stateZip, state, zip, phoneNumber, website;

    // *** NOTE *** sometime the class name won't be 'div.section-result-content'
    // it can be '.section-place-result-container-summary button'
    // that might be a way google counter scraping, I don't know how to work around it yet
    // document.querySelectorAll('div.section-result-content h3')[0].innerText
    ////////// no use selecting 'a' tag, it is not clickable
    // document.querySelectorAll('a[style*="display: none;"]')
    // document.querySelectorAll('a[style*="display:none"]')

    // go to back to result page don't use await page.goBack();
    // instead select the back button and click it

    // *** NOTE *** Error: Node is detached from document
    // one solution is to evaluate the same selector every time the page navigate.


    /*
    // after search, scraped current page results, go to next page of results
    var temp = [];
    let urls = [];
    let hasNext = true
    while(hasNext) {
        // some how wait for div.section-result-content before and inside the loop makes less problem
        // await page.waitForSelector('div.section-result-content');
        temp = await loopClickCompResult(page,navigationPromise);
        await page.waitForTimeout(renInt(1000, 2000));
        urls = [...urls, ...temp];
        // need to check for disabled, because disabled element can still be click, can cause invite loop
        var nextBtnDisabled = await page.$('button#n7lv7yjyC35__section-pagination-button-next:disabled');
        await page.waitForTimeout(renInt(1000, 2000));
        var nextPageResults = await page.$('button#n7lv7yjyC35__section-pagination-button-next');
        await page.waitForTimeout(renInt(1000, 2000));
        if(nextBtnDisabled !== null){
            hasNext = false;
            console.log(hasNext);
        }else if(nextPageResults !== null){
            await page.waitForTimeout(renInt(5000, 6000));
            console.log(hasNext);
            await nextPageResults.click(); 
            await navigationPromise;
            await page.waitForTimeout(renInt(1000, 2000));
        }
    }
    */
    // after search, scraped current page results, go to next page of results
    // a work around, search smarter by append "near zip code" after search key,
    // also only search first page
    var temp = [];
    let urls = [];
    // some how wait for div.section-result-content before and inside the loop makes less problem
    // await page.waitForSelector('div.section-result-content');
    temp = await loopClickCompResult(page,navigationPromise);
    await page.waitForTimeout(renInt(500, 600));
    urls = [...urls, ...temp];
    // need to check for disabled, because disabled element can still be click, can cause invite loop


    ////////////////////////// another list of results on current page ////////////////////////////

    // var searchKey = "san francisco japanese market";
    // var searchKey = "seattle marketing firm";
    // var ariaLabel="Results for "+searchKey;
    // // array of elements contain current page results
    // var elements = document.querySelectorAll(`div.section-layout.section-scrollbox.scrollable-y.scrollable-show.section-layout-flex-vertical [aria-label="${ariaLabel}"]`);
    // // array of current page results
    // elements[0].querySelectorAll('.sJKr7qpXOXd__result-container.sJKr7qpXOXd__two-actions.sJKr7qpXOXd__wide-margin');

    await page.close();
    await browser.close();
    console.log("done scraping");
    return urls;
};
app.post('/api6', async function (req, res) {
    req.setTimeout(0);
    let searchKey = req.body.targetPage3 || "";
    try{
        const companies = await scrape6(searchKey);
        // res.status(200).send(removeDuplicateResult2(companies));
        res.status(200).send(companies);
    }catch(err){
        console.error(err)
        res.status(200).send({error: 'TimeoutError', solution: 'refresh, try again'});
    }
});

// scrape for all "a" tag's "href" content of given page
// standard the page
let scrape7 = async (targetPage) => {
    // let hrefs = [];
    // // other than normal html page, it can scrape xml sitemap page
    // if(targetPage.endsWith('.xml')){
    //     await sitemap.fetch(targetPage)
    //     .then(sites=>{
    //         hrefs=sites.sites;
    //     })
    //     .catch(error => console.log(error));
    // }
    // else{
    //     console.log('hrefs: ',hrefs.length, hrefs);
    // }
    // return hrefs;
    let results = [];
    let hrefs = [];
    // get url from xml sitemap page
    if(targetPage.endsWith('.xml')){
        try{
            // hrefs = await (await sitemap.fetch(targetPage)).sites;
            let getUrls = await sitemap.fetch(targetPage);
            hrefs = await getUrls.sites;
        }catch(error) {
            console.log("Error, no site url");
        }   
    }
    else{
        console.log('This is not a xml sitemap link');
    }

    //
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: true, slowMo: 100}); // need for real server
    // var browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true, slowMo: 100});  // need to slow down to content load

    var page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    var navigationPromise =  page.waitForNavigation();

    await page.setUserAgent(userAgent.random().toString());
    // await page.setDefaultNavigationTimeout(0);   // use when set your own timeout
    // hrefs.unshift('https://httpstat.us/404')    // test for 404 page
    results = await loopUrlsForH1H2(page, navigationPromise, hrefs);

    await page.close();
    await browser.close();
    console.log("done scraping");
    return results;
};
app.post('/api7', async function (req, res) {
    req.setTimeout(0);
    let targetPage = req.body.targetPage4 || "";
    await scrape7(targetPage)
    .then((resultArr)=>{
        res.send(resultArr);
        // forLoop(resultArr)
        // .then(resultArray => {
        //     res.send(resultArray);
        // })
    }).catch(() => {});    
});

let scrape8 = async (targetPage) => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: true, slowMo: 100}); // need for real server
    // var browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true, slowMo: 100});  // need to slow down to content load

    var page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    var navigationPromise =  page.waitForNavigation();

    // await page.setUserAgent(userAgent.random().toString());
    // await page.setDefaultNavigationTimeout(0);   // use when set your own timeout

    await page.goto(targetPage, { timeout: 10000, waitUntil: 'load' });
    await navigationPromise;

    await page.waitForTimeout(renInt(500, 600));
    let str = await page.evaluate((selector) => {
        let el = document.querySelector(selector);
        return el ? el.innerText : "innerText error";
    }, 'body');
    // console.log(str);
    // break word like "HelloWorld" to "Hello World"
    let formatedStr = str.replace(/([a-z0-9])([A-Z][a-z0-9])/g, '$1 $2').trim();
    // console.log(formatedStr);
    // split string to array by space
    let strArr = formatedStr.split(/\s/);
    // console.log(strArr);
    // filter out empty string from array
    var filteredStrArr = strArr.filter(el => el != '');
    // console.log(filteredStrArr);
    await page.waitForTimeout(renInt(500, 600));
    
    await page.close();
    await browser.close();
    console.log("done scraping");
    return filteredStrArr;
};
app.post('/api8', async function (req, res) {
    req.setTimeout(0);
    let targetPage = req.body.targetPage5 || "";
    await scrape8(targetPage)
    .then((resultArr)=>{
        res.send(wordCountObj(resultArr));
    }).catch(() => {}); 
});