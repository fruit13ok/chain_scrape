console.log("Sanity Check: JS is working!");
// let domain = "localhost";
let domain = "165.232.52.237";   // scraperserver droplet (new)
// let port = 8000;
// let port = 8443;
// let port = 8080;
let port = 443;
// let port = 80;

let backendRoute = new URL("http://"+domain+":"+port+"/api");
let backendRoute2 = new URL("http://"+domain+":"+port+"/api2");
let backendRoute3 = new URL("http://"+domain+":"+port+"/api3");
let backendRoute4 = new URL("http://"+domain+":"+port+"/api4");
let backendRoute5 = new URL("http://"+domain+":"+port+"/api5");
let backendRoute6 = new URL("http://"+domain+":"+port+"/api6");
let backendRoute7 = new URL("http://"+domain+":"+port+"/api7");
let backendRoute8 = new URL("http://"+domain+":"+port+"/api8");

// this frontend scrape function do post request to backend scrape route,
// pass in back end route and form object of search key and search depth
let elapsedMinutes;
let elapsedSeconds;

// variable for api4 might want to put it with in, not up here
let jsonResult = [];
let fileName = "";
let cityName = "";

// async function getLocation() {
function getLocation() {
    console.log('run getLocation');
    if (navigator.geolocation) {
        console.log('Use GPS location');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // console.log('lat: ', position.coords.latitude);
                // console.log('long: ', position.coords.longitude);
                // Free usage 5000 requests per day
                fetch(`https://us1.locationiq.com/v1/reverse.php?key=pk.a18e937e08f5cd1f7431e37f6d6e4974&lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`)
                .then(res => res.json())
                .then(location => {
                    cityName = location.address.city;
                    console.log('city: ', location.address.city);
                })
                .catch((error) => {
                    console.error('GPS location Error:', error);
                });
            }
            // ,
            // () => {
            //     console.log('GPS location not available, use ip location');
            //     // Free usage 50000 requests per month. else return 429 HTTP status code
            //     fetch('https://ipinfo.io/json?token=c6d7eb39fe299f')
            //     // Free usage 30000 requests per month (1000 in 24 hours), NO latitude, longitude
            //     // fetch('https://ipapi.co/json')
            //     .then(res => res.json())
            //     .then(location => {
            //         cityName = location.city;
            //         console.log('city: ', location.city);
            //         return location.city;
            //     })
            //     .catch((error) => {
            //         console.error('IP location Error:', error);
            //     });
            // }
        )
    }else{
        console.log('GPS location not available, use ip location');
        // Free usage 50000 requests per month. else return 429 HTTP status code
        fetch('https://ipinfo.io/json?token=c6d7eb39fe299f')
        // Free usage 30000 requests per month (1000 in 24 hours), NO latitude, longitude
        // fetch('https://ipapi.co/json')
        .then(res => res.json())
        .then(location => {
            cityName = location.city;
            console.log('city: ', location.city);
        })
        .catch((error) => {
            console.error('IP location Error:', error);
        });
    }
}
// get geolocation while page load
getLocation();

// copy JSON result to clipboard, I use "textarea" to maintain text format
// "input" will be string
const copyToClipboard = () => {
    var textToCopy = document.getElementById("preresult").innerText;
    var tempInputElem = document.createElement("textarea"); // textarea save text format too
    tempInputElem.type = "text";
    tempInputElem.value = textToCopy;
    document.body.appendChild(tempInputElem);
    tempInputElem.select(); // select only work for input or textarea
    tempInputElem.setSelectionRange(0, 99999)   // for mobile phone
    document.execCommand("Copy");
    document.body.removeChild(tempInputElem);
}

// make PDF with jspdf and jspdf-autotable
// learn more from my "all_links" repo
// Default export is a4 paper, portrait, using millimeters for units
const convertAndDownloadPDF = (jsonResult) => {
    console.log('jsonResult: ',jsonResult);
    let header = Object.keys(jsonResult[0]);
    let data = jsonResult.map(e=>Object.values(e));
    // body need spread operartor because is nested
    console.log("header: ",header);
    console.log("data: ",...data);
    // var doc = new jsPDF({ orientation: "landscape" })
    var doc = new jsPDF()
    doc.autoTable({
        head: [header],
        body: [...data],
        // columnStyles: {0: {cellWidth: 150}}
    })
    doc.save(fileName+'.pdf')
};

// html attribute download file
// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
const download = (filename, text) => {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

// converter JSON to CSV return string, than download
const convertAndDownloadCSV = (jsonResult) => {
    // incase of result is not an array of object, convert to json string than, to json object
    console.log('jsonResult: ',jsonResult);
    var objArray = JSON.stringify(jsonResult);
    console.log('objArray: ', objArray);
    // usually "array" is same as given "jsonResult"
    let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    console.log('array: ', array);
    let str = Object.keys(array[0]).join()+'\r\n';
    console.log('keys: ', str);
    for (let i = 0; i < array.length; i++) {
        console.log(i,': ', array[i]);
        let line = '';
        for (let index in array[i]) {
            if (line != '') {
            line += ',';
            }
            line += array[i][index];
            console.log(index,': ', line);
        }
            str += line + '\r\n';
    }
    download(fileName+'.csv', str);
};

// add downloadable buttons PDF CSV before scrape result
const generateDownloadButtons = (htmlElement) => {
    let buttonPDF = document.createElement('button');
    buttonPDF.id = "btnpdf";
    buttonPDF.innerHTML = "Download PDF";
    buttonPDF.className = "btn btn-info mt-2 mb-2";
    let span1 = document.createElement('span');
    span1.innerHTML = ' ';
    let buttonCSV = document.createElement('button');
    buttonCSV.id = "btncsv";
    buttonCSV.innerHTML = "Download CSV";
    buttonCSV.className = "btn btn-info mt-2 mb-2";
    let span2 = document.createElement('span');
    span2.innerHTML = ' ';
    let buttonCopy = document.createElement('button');
    buttonCopy.id = "btncopy";
    buttonCopy.innerHTML = "Copy Result";
    buttonCopy.className = "btn btn-info mt-2 mb-2";
    htmlElement.appendChild(buttonPDF);
    htmlElement.appendChild(span1);
    htmlElement.appendChild(buttonCSV);
    htmlElement.appendChild(span2);
    htmlElement.appendChild(buttonCopy);
};

// add dropdown list to filter the JSON result by count
const generateDropdown = (htmlElement) => {
    let span = document.createElement('span');
    span.innerHTML = ' ';
    let label = document.createElement("label");
    label.setAttribute("for", "mySelect");
    label.innerHTML = 'filter by count: ';
    let select = document.createElement("select");
    select.setAttribute("id", "mySelect");
    for (let i = 0; i <= 3; i++) {
        let option = document.createElement("option");
        option.setAttribute("value", i);
        option.text = i;
        select.appendChild(option);
    }
    htmlElement.appendChild(span);
    htmlElement.appendChild(label);
    htmlElement.appendChild(select);
};

// filter number of count or below
let filterByCount = (unFilArrObjs, countBy) => {
    let filtered = unFilArrObjs.filter((obj)=>{
        return (obj.count > countBy)
    });
    return filtered;
};

const getScrape = async (backendRoute, formObj) => {
    let jResult = [];
    try {
        // 
        let timeStart = performance.now();
        const response = await fetch(backendRoute, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        let timeComplete = performance.now();

        let minutes = Math.floor((timeComplete - timeStart) / 60000);
        let seconds = (((timeComplete - timeStart) % 60000) / 1000).toFixed(0);

        console.log("scraped time spent: " + minutes + ":" + seconds);
        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        // I change display from list to JSON, see version before 7-3-2020
        generateDownloadButtons(mList);
        // add dropdown list to filter JSON result by count
        generateDropdown(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        // filter JSON result by count
        jResult = filterByCount(json,0);
        pre.innerHTML = JSON.stringify(jResult, null, 4);
        mList.appendChild(pre);
	    elapsedMinutes = minutes;
	    elapsedSeconds = seconds;
	    document.getElementById('elapsed-time').innerHTML =  '<p><b>Response Time: </b>' + elapsedMinutes + ' minutes and ' + elapsedSeconds + ' seconds</p>';
    }catch (error) {
        console.log(error);
    }
    return jResult;
};
const getScrape2 = async (backendRoute2, formObj) => {
    try {
	let timeStart = performance.now();
        const response = await fetch(backendRoute2, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

	    let timeComplete = performance.now();

        let minutes = Math.floor((timeComplete - timeStart) / 60000);
        let seconds = (((timeComplete - timeStart) % 60000) / 1000).toFixed(0);

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // let ul = document.createElement('ul');
	    // ul.className = 'list-group';
        // mList.appendChild(ul);
        // for(let i=0; i<json.length; i++){
        //     let li = document.createElement('li');
	    //     li.className = 	'list-group-item';
        //     ul.appendChild(li);
        //     li.innerHTML += JSON.stringify(json[i])+',';
        // }
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
        elapsedMinutes = minutes;
        elapsedSeconds = seconds;
        document.getElementById('elapsed-time').innerHTML =  '<p><b>Response Time: </b>' + elapsedMinutes + ' minutes and ' + elapsedSeconds + ' seconds</p>';
    }catch (error) {
        console.log(error);
    }
};

const getScrape3 = async (backendRoute3, formObj) => {
    try {
        const response = await fetch(backendRoute3, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';

        // this version is JSON format array of objects
        // each object has search key and result array
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
    }catch (error) {
        console.log(error);
    }
};

const getScrape4 = async (backendRoute4, formObj) => {
    let jResult = [];
    try {
        const response = await fetch(backendRoute4, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        fileName = formObj.targetPage1 || "";
        console.log('formObj',formObj.targetPage1);
        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
    }catch (error) {
        console.log(error);
    }
    return jResult;
};

const getScrape5 = async (backendRoute5, formObj) => {
    let jResult = [];
    try {
        const response = await fetch(backendRoute5, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        fileName = formObj.targetPage2 || "";
        console.log('formObj',formObj.targetPage2);
        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
    }catch (error) {
        console.log(error);
    }
    return jResult;
};

const getScrape6 = async (backendRoute6, formObj) => {
    let jResult = [];
    try {
        const response = await fetch(backendRoute6, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        fileName = formObj.targetPage3 || "";
        console.log('formObj',formObj.targetPage3);
        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
    }catch (error) {
        console.log(error);
    }
    return jResult;
};

const getScrape7 = async (backendRoute7, formObj) => {
    let jResult = [];
    try {
        const response = await fetch(backendRoute7, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
    }catch (error) {
        console.log(error);
    }
    return jResult;
};

const getScrape8 = async (backendRoute8, formObj) => {
    let jResult = [];
    try {
        const response = await fetch(backendRoute8, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.id = "preresult";
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
    }catch (error) {
        console.log(error);
    }
    return jResult;
};

// submit button clicked, pass form data into scrape function and invoke it
$(function(){
    // I try to hide body for 2 seconds to wait for geolocation to fetch,
    // but some browser does not show body
    // $(window).on('load',function () {
    //     setTimeout(function(){
    //         $('body').fadeIn('slow', function () {});
    //     },2000);
    // });
    $("#button1").on("click", function(){
        console.log("cityName", cityName);
        let formArr = $("#form1").serializeArray();
        // console.log('formArr',formArr);
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        if(formObj.currentCity == "yes"){
            formObj.searchKey = formObj.searchKey + " " + cityName;
        }
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Find related searchs please wait ... </strong></p>';
	    console.log('formObj',formObj);
        // getScrape(backendRoute, formObj);
        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape(backendRoute, formObj)
        })();
    });
    
    $("#button2").on("click", function(){
        let formArr = $("#form2").serializeArray();
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Search words in a page please wait ... </strong></p>';
	    console.log('formObj',formObj);
        getScrape2(backendRoute2, formObj);
    });
    
    $("#button3").on("click", function(){
        let formArr = $("#form3").serializeArray();
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Search words in a page please wait ... </strong></p>';
	    console.log('formObj',formObj);
        getScrape3(backendRoute3, formObj);
    });
    
    $("#button4").on("click", function(){
        let formArr = $("#form4").serializeArray();
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Find related searchs please wait ... </strong></p>';
        console.log('formObj',formObj);
        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape4(backendRoute4, formObj)
        })();
    });
    
    $("#button5").on("click", function(){
        let formArr = $("#form5").serializeArray();
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Searching please wait ... </strong></p>';
        console.log('formObj',formObj);
        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape5(backendRoute5, formObj)
        })();
    });

    $("#button6").on("click", function(){
        let formArr = $("#form6").serializeArray();
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Searching please wait ... </strong></p>';
        console.log('formObj',formObj);
        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape6(backendRoute6, formObj)
        })();
    });

    $("#button7").on("click", function(){
        let formArr = $("#form7").serializeArray();
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Find related searchs please wait ... </strong></p>';
        console.log('formObj',formObj);
        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape7(backendRoute7, formObj)
        })();
    });

    $("#button8").on("click", function(){
        let formArr = $("#form8").serializeArray();
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Find related searchs please wait ... </strong></p>';
        console.log('formObj',formObj);
        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape8(backendRoute8, formObj)
        })();
    });

    // need start with static element for event binding on dynamically created elements
    $("#result-list").on("click", "#btnpdf", function(){
        convertAndDownloadPDF(jsonResult);
    });

    // onclick convert JSON to CSV and download it
    $("#result-list").on("click", "#btncsv", function(){
        convertAndDownloadCSV(jsonResult);
    });

    // onclick copy result inside pre to clipboard
    $("#result-list").on("click", "#btncopy", function(){
        copyToClipboard();
    });

    // onclick dropdown list filter JSON result by count 
    $("#result-list").on("change", "#mySelect", function(){
        let pre = document.getElementById('preresult');
        pre.innerHTML = JSON.stringify(filterByCount(jsonResult, $(this).val()), null, 4);
    });
});
