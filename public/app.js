console.log("Sanity Check: JS is working!");
// let backendRoute = new URL("http://localhost:8000/api");
// let backendRoute2 = new URL("http://localhost:8000/api2");
// let backendRoute3 = new URL("http://localhost:8000/api3");
let backendRoute4 = new URL("http://localhost:8000/api4");
// let backendRoute = new URL("http://138.68.234.14:8000/api");
// let backendRoute2 = new URL("http://138.68.234.14:8000/api2");
// let backendRoute3 = new URL("http://138.68.234.14:8000/api3");
// let backendRoute4 = new URL("http://138.68.234.14:8000/api4");

// this frontend scrape function do post request to backend scrape route,
// pass in back end route and form object of search key and search depth
let elapsedMinutes;
let elapsedSeconds;

// variable for api4 might want to put it with in, not up here
let jsonResult = [];

const getScrape = async (backendRoute, formObj) => {
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
    let jr = [];
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
        let button = document.createElement('button');
        button.id = "cmd";
        button.innerHTML = "Download PDF";
        button.className = "btn btn-info mt-2 mb-2";
        let pre = document.createElement('pre');
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(button);
        mList.appendChild(pre);
        jr = json;
    }catch (error) {
        console.log(error);
    }
    return jr;
};

// submit button clicked, pass form data into scrape function and invoke it
$(document).ready(function(){

    $("#button1").click(function(){
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
        getScrape(backendRoute, formObj);
    });

    $("#button2").click(function(){
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

    $("#button3").click(function(){
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

    $("#button4").click(function(){
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
    // need start with static element for event binding on dynamically created elements
    // Default export is a4 paper, portrait, using millimeters for units
    $("#result-list").on("click", "#cmd", function(){
        console.log('jsonResult: ',jsonResult);
        // better version use "jsPDF Autotable"
        // for simpler versions see my repo "try_jspdf" or "all_links"
        // to install I use CDN links
        // source:
        // https://github.com/simonbengtsson/jsPDF-AutoTable
        // some config:
        // https://stackoverflow.com/questions/38787437/different-width-for-each-columns-in-jspdf-autotable
        // I break JSON into "header" and "value" for table
        // use "columnStyles" and "cellWidth" to set first column size
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
    });
});
