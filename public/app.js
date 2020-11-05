console.log("Sanity Check: JS is working!");
let domain = "localhost";
// let domain = "165.232.52.237";   // scraperserver droplet (new)
let port = 8000;

let backendRoute = new URL("http://"+domain+":"+port+"/api");
let backendRoute2 = new URL("http://"+domain+":"+port+"/api2");
let backendRoute3 = new URL("http://"+domain+":"+port+"/api3");
let backendRoute4 = new URL("http://"+domain+":"+port+"/api4");
let backendRoute5 = new URL("http://"+domain+":"+port+"/api5");
let backendRoute6 = new URL("http://"+domain+":"+port+"/api6");

// this frontend scrape function do post request to backend scrape route,
// pass in back end route and form object of search key and search depth
let elapsedMinutes;
let elapsedSeconds;

// variable for api4 might want to put it with in, not up here
let jsonResult = [];

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
        columnStyles: {0: {cellWidth: 150}}
    })
    doc.save('test.pdf')
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
    download('test.csv', str);
};

// add downloadable buttons PDF CSV before scrape result
const generateDownloadButtons = (htmlElement) => {
    let buttonPDF = document.createElement('button');
    buttonPDF.id = "btnpdf";
    buttonPDF.innerHTML = "Download PDF";
    buttonPDF.className = "btn btn-info mt-2 mb-2";
    let span = document.createElement('span');
    span.innerHTML = ' ';
    let buttonCSV = document.createElement('button');
    buttonCSV.id = "btncsv";
    buttonCSV.innerHTML = "Download CSV";
    buttonCSV.className = "btn btn-info mt-2 mb-2";
    htmlElement.appendChild(buttonPDF);
    htmlElement.appendChild(span);
    htmlElement.appendChild(buttonCSV);
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
        let pre = document.createElement('pre');
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jResult = json;
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
        let ul = document.createElement('ul');
	    ul.className = 'list-group';
        mList.appendChild(ul);
        for(let i=0; i<json.length; i++){
            let li = document.createElement('li');
	        li.className = 	'list-group-item';
            ul.appendChild(li);
            li.innerHTML += JSON.stringify(json[i])+',';
        }
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

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
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

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
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

        console.log('response',response);
        let json = await response.json();
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        // add downloadable buttons PDF CSV
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
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
    
    $("#button1").on("click", function(){
        let formArr = $("#form1").serializeArray();
        // console.log('formArr',formArr);
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
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

    // need start with static element for event binding on dynamically created elements
    $("#result-list").on("click", "#btnpdf", function(){
        convertAndDownloadPDF(jsonResult);
    });

    // onclick convert JSON to CSV and download it
    $("#result-list").on("click", "#btncsv", function(){
        convertAndDownloadCSV(jsonResult);
    });
});
