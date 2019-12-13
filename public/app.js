console.log("Sanity Check: JS is working!");
// let backendRoute = new URL("http://localhost:8000/api");
let backendRoute = new URL("http://138.68.234.14:8000/api");

// this frontend scrape function do post request to backend scrape route,
// pass in back end route and form object of search key and search depth
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
    }catch (error) {
        console.log(error);
    }
};
// submit button clicked, pass form data into scrape function and invoke it
$(document).ready(function(){
    $("button").click(function(){
        let formArr = $("form").serializeArray();
        // console.log('formArr',formArr);
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        console.log('formObj',formObj);
        getScrape(backendRoute, formObj);
    });
});