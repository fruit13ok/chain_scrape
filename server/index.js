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
        return 0;
    }else if(searchDepth == 1){
        return 1;
    }else if(searchDepth == 2){
        return 9;
    }else if(searchDepth == 3){
        return 73;
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
            movieList.push(temp);
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
                })
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
        res.status(200).send(wordCountObj(rlist));
    });
})