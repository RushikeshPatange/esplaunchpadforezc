// const baudrates = document.getElementById("baudrates");
const connectButton = document.getElementById("connectButton");
// const disconnectButton = document.getElementById("disconnectButton");
const resetButton = document.getElementById("resetButton");
const consoleStartButton = document.getElementById("consoleStartButton");
const resetMessage = document.getElementById("resetMessage");
// const eraseButton = document.getElementById("eraseButton");
// const programButton = document.getElementById("programButton");
// const filesDiv = document.getElementById("files");
const terminal = document.getElementById("terminal");
const ensureConnect = document.getElementById("ensureConnect");
const lblConnTo = document.getElementById("lblConnTo");
const table = document.getElementById('fileTable');
const alertDiv = document.getElementById('alertDiv');
const settingsWarning = document.getElementById("settingsWarning");
const progressMsgQS = document.getElementById("progressMsgQS");
const progressMsgDIY = document.getElementById("progressMsgDIY");
const deviceTypeSelect = document.getElementById("device");
const frameworkSelect = document.getElementById("frameworkSel");
const chipSetsRadioGroup = document.getElementById("chipsets");
const mainContainer = document.getElementById("mainContainer");
let resizeTimeout = false;

import * as esptooljs from "../node_modules/esptool-js/bundle.js";
const ESPLoader = esptooljs.ESPLoader;
const Transport = esptooljs.Transport;

const usbPortFilters = [
    { usbVendorId: 0x10c4, usbProductId: 0xea60 }, /* CP2102/CP2102N */
    { usbVendorId: 0x0403, usbProductId: 0x6010 }, /* FT2232H */
    { usbVendorId: 0x303a, usbProductId: 0x1001 }, /* Espressif USB_SERIAL_JTAG */
    { usbVendorId: 0x303a, usbProductId: 0x1002 }, /* Espressif esp-usb-bridge firmware */
    { usbVendorId: 0x303a, usbProductId: 0x0002 }, /* ESP32-S2 USB_CDC */
    { usbVendorId: 0x303a, usbProductId: 0x0009 }, /* ESP32-S3 USB_CDC */
];

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)

let term = new Terminal({cols:getTerminalColumns(), rows:23, fontSize: 14});
let fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(terminal);
fitAddon.fit();

let device = null;
let transport;
let chip = "default";
let chipDesc = "default"
let esploader;
let file1 = null;
let connected = false;
let ios_app_url = "";
let android_app_url = "";

// disconnectButton.style.display = "none";
eraseButton.style.display = "none";
var config = [];
var isDefault = true;

// Code for ESPLaunchpad to work it for EZC
const consolePage = document.getElementById("console")
const spinner = document.getElementById("spinner")
const col1 = document.getElementById("col1")
const col2 = document.getElementById("col2")
let partsArray = undefined
let addressesArray = undefined
function build_DIY_UI(){
 console.warn(config)
  let application = "supported_apps"
  let chipInConfToml = undefined
  let imageString = undefined;
  let addressString = undefined
  console.log(chip)
  if(chip !== "default" && config["multipart"]){
    chipInConfToml = config["chip"]
    console.log(chipInConfToml)
  }
   if(chip !=="default" && chipInConfToml !== undefined && chipInConfToml === chip.toLowerCase()){
     imageString = "image." + chipInConfToml.toLowerCase() + ".parts"
     addressString = "image." + chipInConfToml.toLowerCase() + ".addresses"
   }
   console.warn(config[application][0])
   partsArray = config[config[application][0]][imageString]
   addressesArray = config[config[application][0]][addressString]
}
async function downloadAndFlashForEZC(){
    let fileArr = []
    console.log(partsArray)
    for (let index = 0; index < partsArray.length; index ++) {
    
        let data = await new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', partsArray[index], true);
            xhr.responseType = "blob";
            xhr.send();
            xhr.onload = function () {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    var blob = new Blob([xhr.response], {type: "application/octet-stream"});
                    var reader = new FileReader();
                    reader.onload = (function(theFile) {
                        return function(e) {
                            resolve(e.target.result);
                        };
                    })(blob);
                    reader.readAsBinaryString(blob);
                } else {
                    resolve(undefined);
                }
            };
            xhr.onerror = function() {
                resolve(undefined);
            }
        });
        fileArr.push({data:data, address:addressesArray[index]});
    }
    $('#console').click();
    try {
       await esploader.write_flash(fileArr,'keep');
       esploader.status = "complete"
    } catch (error) {
  }}
function MDtoHtmlForEZC(){
let application = "supported_apps"
 console.warn(config[config[application][0]]["readme.text"])
const EZCMessage = document.getElementById("EZCMessege")
var converter = new showdown.Converter({tables: true})
converter.setFlavor('github');
// $("#EZCConfirmation").click()
try {
fetch(config[config[application][0]]["readme.text"]).then(response =>{
    return response.text()
}).then(result=>{
let htmlText = converter.makeHtml( result);
EZCMessage.innerHTML = htmlText
EZCMessage.style.display = "block"  
})
} catch (error) {    
 console.warn(error)
}
}
// Build the Quick Try UI using the config toml file. If external path is not specified, pick up the default config
async function buildQuickTryUI() {
    const urlParams = new URLSearchParams(window.location.search);
    var tomlFileURL = window.location.origin + window.location.pathname + "config/rainmaker_config.toml"; // defaulting to rainmaker for now.
    var solution = urlParams.get("solution");
    if (solution){
        if (solution.toLowerCase() == "matter")
            // use the one published by the ci/cd job of matter on the github
            tomlFileURL = "https://espressif.github.io/esp-matter/launchpad.toml"
        else if(solution.toLowerCase() == "rainmaker")
            // use the one bundled in the config
            tomlFileURL = window.location.origin + window.location.pathname + "config/rainmaker_config.toml";
    }
    else {
        const url = window.location.search
        const parameter = "flashConfigURL"
         if(url.includes("&")){
             tomlFileURL = url.substring(url.search(parameter)+parameter.length+1)
         }else
        {
             tomlFileURL = urlParams.get(parameter);
        }
            isDefault = false;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', tomlFileURL, true);
    xhr.send();
    xhr.onload = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            config = toml.parse(xhr.responseText);

            if(!isDefault) {
                $("#qtLabel").html("Choose from the firmware images listed below. <Br> You have chosen to try the firmware images from an <b><u>external source</u> - "
                                            + tomlFileURL + "</b>");
            }
            try {
                if (parseFloat(config["esp_toml_version"]) === 1.0)
                    buildQuickTryUI_v1_0();

                else
                    alert("Unsupported config version used!!")
            }
            catch (err){
                alert ("Unsupported config version used -" + err.message)
            }

            return config;
        }
    }
}


//Parsing of toml based on v1.0 and builing UI accordingly.
function buildQuickTryUI_v1_0() {
    const supported_apps = config["supported_apps"]
    if(supported_apps) {
        addDeviceTypeOption(supported_apps);
        populateSupportedChipsets(config[supported_apps[0]]);
    }
    setAppURLs(config[supported_apps[0]]);
}

function addDeviceTypeOption(apps) {
    deviceTypeSelect.innerHTML = "";
    apps.forEach(app => {
        var app_config = config[app];
            var option = document.createElement("option");
            option.value = app;
            option.text = app;
            deviceTypeSelect.appendChild(option);
    });
}

config = await buildQuickTryUI();

/*
function populateDeviceTypes(imageConfig) {
    deviceTypeSelect.innerHTML = "";
    const availableImages = imageConfig["images"];
    availableImages.forEach(image => {
        var imageOption = image.split(':');
        var option = document.createElement("option");
        option.value = imageOption[0];
        option.text = imageOption[1];
        deviceTypeSelect.appendChild(option);
    });
}*/

function populateSupportedChipsets(deviceConfig) {
    chipSetsRadioGroup.innerHTML = "";
    const supportedChipSets = deviceConfig["chipsets"];
    let i = 1;
    supportedChipSets.forEach(chipset => {
        //var chipKV = chipset.split(":");
        var div = document.createElement("div");
        div.setAttribute("class", "form-check-inline");

        var lblElement = document.createElement("label");
        lblElement.setAttribute("class", "form-check-label");
        lblElement.setAttribute("for", "radio-" + chipset);
        lblElement.innerHTML = chipset + "&nbsp;";

        var inputElement = document.createElement("input");
        inputElement.setAttribute("type", "radio");
        inputElement.setAttribute("class", "form-check-input");
        inputElement.name = "chipType";
        inputElement.id = "radio-" + chipset;
        inputElement.value = deviceConfig["image." + chipset.toLowerCase()]
        if (chipset.toLowerCase() === chip.toLowerCase())
            inputElement.checked = true;

        lblElement.appendChild(inputElement);

        div.appendChild (lblElement);

        chipSetsRadioGroup.appendChild(div);

        i++;
    });
}

function setAppURLs(appConfig) {
    ios_app_url = appConfig.ios_app_url;
    android_app_url = appConfig.android_app_url;
}

$('#frameworkSel').on('change', function() {
    //populateDeviceTypes(config[frameworkSelect.value]);
    addDeviceTypeOption(config["supported_apps"], frameworkSelect.value);
    setAppURLs(frameworkSelect.value)
});

$('#device').on('change', function() {
    populateSupportedChipsets(config[deviceTypeSelect.value]);
    setAppURLs(config[deviceTypeSelect.value])
});

$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})

function convertUint8ArrayToBinaryString(u8Array) {
	var i, len = u8Array.length, b_str = "";
	for (i=0; i<len; i++) {
		b_str += String.fromCharCode(u8Array[i]);
	}
	return b_str;
}

function convertBinaryStringToUint8Array(bStr) {
	var i, len = bStr.length, u8_array = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		u8_array[i] = bStr.charCodeAt(i);
	}
	return u8_array;
}

function handleFileSelect(evt) {
    var file = evt.target.files[0];
    var reader = new FileReader();

    reader.onload = (function(theFile) {
        return function(e) {
            file1 = e.target.result;
            evt.target.data = file1;
        };
    })(file);

    reader.readAsBinaryString(file);
}


document.getElementById('selectFile1').addEventListener('change', handleFileSelect, false);

function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let espLoaderTerminal = {
    clean() {
      term.clear();
    },
    writeLine(data) {
      term.writeln(data);
    },
    write(data) {
      term.write(data)
    }
}

async function connectToDevice() {
    connectButton.style.display = "none"
    if (device === null) {
        console.warn("Inside connetcTodeviice")
        device = await navigator.serial.requestPort({
            filters: usbPortFilters
        });
        transport = new Transport(device);
    }
    spinner.style.display = "flex"
    spinner.style.flexDirection = "column"
    spinner.style.alignItems = "center"

    try {
        esploader = new ESPLoader(transport, "921600", espLoaderTerminal);
        connected = true;

        chipDesc = await esploader.main_fn();
        chip = esploader.chip.CHIP_NAME;

        await esploader.flash_id();
    } catch(e) {
    }
    spinner.style.display = "none"
}

function postConnectControls() {
    if(chipDesc !== "default")
        lblConnTo.innerHTML = "<b><span style='color:#17a2b8'>Connected to device: </span>" + chipDesc + "</b>";
    else
        lblConnTo.innerHTML = "<b><span style='color:red'>Unable to detect device. Please ensure the device is not connected in another application</span></b>";
    lblConnTo.style.display = "block";
    $("#baudrates").prop("disabled", true);
    $("#flashButton").prop("disabled", false);
    $("#flashWrapper").tooltip().attr('data-bs-original-title', "This will download and flash the firmware image on your device");
    $("#programButton").prop("disabled", false);
    $("#consoleStartButton").prop("disabled", false);
    ensureConnect.style.display = "none"
    settingsWarning.style.display = "initial";
    connectButton.style.display = "none";
    disconnectButton.style.display = "initial";
    eraseButton.style.display = "initial";
    filesDiv.style.display = "initial";
    $('input:radio[id="radio-' + chip + '"]').attr('checked', true);
}
connectButton.onclick = async () => {
    try {
     if(!connected)
        await connectToDevice();

        console.log("Settings done for :" + chip);
        consolePage.classList.remove("main-page-tab-panel")
        consolePage.classList.add("fade-in")
        col2.classList.remove("col")
        col2.classList.add("col-12")
        build_DIY_UI()
        // postConnectControls();
        await downloadAndFlashForEZC()
        consoleStartButton.disabled = false
        // consoleStartButton.click()  
        MDtoHtmlForEZC()
        col1.classList.remove("col")
        col1.classList.add("col-6")
        col1.classList.add("fadeInUp")
        col2.classList.remove("col-12")
        col2.classList.add("slide-right")
        col2.classList.add("col-6")

    } catch (error) {
        console.log( error.message)
        if(error.message === "Failed to execute 'requestPort' on 'Serial': No port selected by the user."){
            
            connectButton.style.display = "initial"
            console.log(error)
        }
    }

}


resetButton.onclick = async () => {
    //resetMessage.style.display = "none";
    $('#closeResetModal').click();
    await transport.setDTR(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    await transport.setDTR(true);
    //consoleStartButton.style.display = "block";
}

eraseButton.onclick = async () => {
    eraseButton.disabled = true;
    $('#v-pills-console-tab').click();
    await esploader.erase_flash();
    eraseButton.disabled = false;
}

addFile.onclick = async () => {
    var rowCount = table.rows.length;
    var row = table.insertRow(rowCount);
    
    //Column 1 - Offset
    var cell1 = row.insertCell(0);
    var element1 = document.createElement("input");
    element1.type = "text";
    element1.id = "offset" + rowCount;
    element1.setAttribute('value', '0x8000');
    cell1.appendChild(element1);
    
    // Column 2 - File selector
    var cell2 = row.insertCell(1);
    var element2 = document.createElement("input");
    element2.type = "file";
    element2.id = "selectFile" + rowCount;
    element2.name = "selected_File" + rowCount;
    element2.addEventListener('change', handleFileSelect, false);
    cell2.appendChild(element2);
    
    // Column 3  - Remove File
    var cell3 = row.insertCell(2);
    var element3 = document.createElement("input");
    element3.type = "image";
    element3.src = "assets/icons/remove.png";
    var btnName = "rem-" + rowCount;
    element3.name = btnName;
    element3.onclick = function() {
            removeRow(btnName);
            return false;
    }
    cell3.appendChild(element3);
}

function removeRow(btnName) {
    var rowCount = table.rows.length;
    for (var i = 0; i < rowCount; i++) {
        var row = table.rows[i];
        var rowObj = row.cells[2].childNodes[0];
        if (rowObj.name == btnName) {
            table.deleteRow(i);
            rowCount--;
        }
    }
}

// to be called on disconnect - remove any stale references of older connections if any
function cleanUp() {
    device = null;
    transport = null;
    chip = null;
}

// disconnectButton.onclick = async () => {
//     if(transport)
//         await transport.disconnect();

//     term.clear();
//     transport = null;
//     connected = false;
//     $("#baudrates").prop("disabled", false);
//     $("#flashButton").prop("disabled", true);
//     $("#flashWrapper").tooltip().attr('data-bs-original-title', "Click on 'Connect' button in top Menu");
//     $("#programButton").prop("disabled", true);
//     $("#consoleStartButton").prop("disabled", true);
//     settingsWarning.style.display = "none";
//     connectButton.style.display = "initial";
//     disconnectButton.style.display = "none";
//     eraseButton.style.display = "none";
//     lblConnTo.style.display = "none";
//     alertDiv.style.display = "none";
//     ensureConnect.style.display = "initial";
//     cleanUp();
// };

consoleStartButton.onclick = async () => {
    if (device === null) {
        device = await navigator.serial.requestPort({
            filters: usbPortFilters
        });
        transport = new Transport(device);
    }
    //resetMessage.style.display = "block";
    //consoleStartButton.style.display = "none";
    $('#resetConfirmation').click();
    await transport.disconnect();
    await transport.connect();

    while (true) {
        let val = await transport.rawRead();
        if (typeof val !== 'undefined') {
            term.write(val);
        } else {
            break;
        }
    }
    console.log("quitting console");
}


function validate_program_inputs() {
    let offsetArr = []
    var rowCount = table.rows.length;
    var row;
    let offset = 0;
    let fileData = null;
 
    // check for mandatory fields
    for (let index = 1; index < rowCount; index ++) {
        row = table.rows[index];

        //offset fields checks
        var offSetObj = row.cells[0].childNodes[0];
        offset = parseInt(offSetObj.value);

        // Non-numeric or blank offset
        if (Number.isNaN(offset))
            return "Offset field in row " + index + " is not a valid address!"
        // Repeated offset used
        else if (offsetArr.includes(offset))
            return "Offset field in row " + index + " is already in use!";
        else
            offsetArr.push(offset);

        var fileObj = row.cells[1].childNodes[0];
        fileData = fileObj.data;
        if (fileData == null)
            return "No file selected for row: " + index + "!";

    }
    return "success"
}

programButton.onclick = async () => {
    var err = validate_program_inputs();
    if (err != "success") {
        const alertMsg = document.getElementById("alertmsg");
        alertMsg.innerHTML = "<strong>" + err + "</strong>";
        alertDiv.style.display = "block";
        return;
    }
    progressMsgDIY.style.display = "inline";
    let fileArr = [];
    let offset = 0x1000;
    var rowCount = table.rows.length;
    var row;
    for (let index = 1; index < rowCount; index ++) {
        row = table.rows[index];
        var offSetObj = row.cells[0].childNodes[0];
        offset = parseInt(offSetObj.value);

        var fileObj = row.cells[1].childNodes[0];
       
        fileArr.push({data:fileObj.data, address:offset});
    }
    await esploader.write_flash(fileArr, 'keep');
    $('#v-pills-console-tab').click();
}

async function downloadAndFlash(fileURL) {
    let data = await new Promise(resolve => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fileURL, true);
        xhr.responseType = "blob";
        xhr.send();
        xhr.onload = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var blob = new Blob([xhr.response], {type: "application/octet-stream"});
                var reader = new FileReader();
                reader.onload = (function(theFile) {
                    return function(e) {
                        resolve(e.target.result);
                    };
                })(blob);
                reader.readAsBinaryString(blob);
            } else {
                resolve(undefined);
            }
        };
        xhr.onerror = function() {
            resolve(undefined);
        }
    });
    if (data !== undefined) {
        $('#v-pills-console-tab').click();
        await esploader.write_flash([{data:data, address:0x0000}], 'keep');
    }
}


// Based on the configured App store links, show the respective download links.
function buildAppLinks(){
    let defaultAppURLsHTML = "You can download phone app from the app store and interact with your device. Scan the QRCode to access the respective apps.<br>";
    let appURLsHTML = "";

    if(android_app_url !== ""){
        new QRCode(document.getElementById("qrcodeAndroidApp"), {
            text: android_app_url,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
	        correctLevel : QRCode.CorrectLevel.H
            });

        $("#androidAppLogo").html("<a href='" + android_app_url + "' target='_blank'><img src='./assets/gplay_download.png' height='50' width='130'></a>");

        new QRCode(document.getElementById("qrcodeAndroidAppQS"), {
            text: android_app_url,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
	        correctLevel : QRCode.CorrectLevel.H
            });

        $("#androidAppLogoQS").html("<a href='" + android_app_url + "' target='_blank'><img src='./assets/gplay_download.png' height='50' width='130'></a>");
        appURLsHTML = defaultAppURLsHTML;
    }

    if(ios_app_url){
        new QRCode(document.getElementById("qrcodeIOSApp"), {
            text: ios_app_url,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
	        correctLevel : QRCode.CorrectLevel.H
            });

        $("#iosAppLogo").html("<a href='" + ios_app_url + "' target='_blank'><img src='./assets/appstore_download.png' height='50' width='130'></a>");

        new QRCode(document.getElementById("qrcodeIOSAppQS"), {
            text: ios_app_url,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
	        correctLevel : QRCode.CorrectLevel.H
            });

        $("#iosAppLogoQS").html("<a href='" + ios_app_url + "' target='_blank'><img src='./assets/appstore_download.png' height='50' width='130'></a>");
        appURLsHTML = defaultAppURLsHTML;
    }
    $("#progressMsgQS").html("Firmware Image flashing is complete. " + appURLsHTML);
    $("#appDownloadLink").html(appURLsHTML);
}

function cleanUpOldFlashHistory() {
    $("#androidAppLogo").html("");
    $("#androidAppLogoQS").html("");
    $("#iosAppLogo").html("");
    $("#iosAppLogoQS").html("");
    $("#progressMsgQS").html("<i>This may take a short while. Check console for the progress</i>");
    $("#qrcodeAndroidApp").html("");
    $("#qrcodeAndroidAppQS").html("");
    $("#qrcodeIOSApp").html("");
    $("#qrcodeIOSAppQS").html("");
}

flashButton.onclick = async () => {
    let flashFile = $("input[type='radio'][name='chipType']:checked").val();
    var file_server_url = config.firmware_images_url;

    progressMsgQS.style.display = "inline";

    cleanUpOldFlashHistory();

    await downloadAndFlash(file_server_url + flashFile);

    buildAppLinks();
    $("#statusModal").click();
    esploader.status = "started";
}

/*
connectPreview.onclick = async () => {
    await connectToDevice();
    if (connected) {
        $('#connectPreview').prop("disabled", true)
        $('#flashCustom').prop("value", "Flash Device: " + chip);
        $('#flashCustom').prop("disabled", false);
    }
}

flashCustom.onclick = async () => {
    if(connected) {
        if (chip != 'default'){
            if (config.esp_chipset_type.toLowerCase() === chip.split('-')[0].toLowerCase()) {
                await downloadAndFlash(config.firmware_images_url)
            }
            else
                alert('Incompatible chipset for the firmare!');
        }
        else
            alert('Chipset type not recognizable!');
    }
    postConnectControls();
}*/

function getTerminalColumns() {
    const mainContainerWidth = mainContainer?.offsetWidth || 1320;
    return Math.round(mainContainerWidth / 8.25); 
}

function resizeTerminal() {
    fitAddon && fitAddon.fit();
}

$( window ).resize(function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeTerminal, 300);
});
