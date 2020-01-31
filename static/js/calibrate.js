function initCalibrate() {
    updateSensor();

    cal1Click = false;
    cal2Click = false;
    updateCalViews();

    $.get("/calibrate_data", function (data) {
        let channelData = data[currentChannel+1];
        if (channelData) {
            ph1.value = parseFloat(channelData["pH1"]).toFixed(2);
            ph2.value = parseFloat(channelData["pH2"]).toFixed(2);
        }
    });
}

let cal1Click = false;
let cal2Click = false;

document.getElementById("cal1_button").addEventListener("click", function () {
    enableButtonFromCal1();
    var dataStop = {'cal_button': 'cal1', 'channel': currentChannel};
    $.ajax({
        url: "/calibrate",
        type: "POST",
        data: dataStop,
    });

});

document.getElementById("cal2_button").addEventListener("click", function () {
    enableButtonFromCal2();
    var dataStop = {'cal_button': 'cal2', 'channel': currentChannel};
    $.ajax({
        url: "/calibrate",
        type: "POST",
        data: dataStop,
    });
});
document.getElementById("calibrate_button").addEventListener("click", function () {
    var dataStop = {
        'cal_button': 'calibrate',
        'channel': currentChannel,
        'ph1': ph1.value,
        'ph2': ph2.value,
        'temperature': document.getElementById("temp").value
    };
    $.ajax({
        url: "/calibrate",
        type: "POST",
        data: dataStop,
        success: function (response) {

            // lastCalibrationLabel.innerHTML = response;
            updateLastCalibration();
            calcDeviation();
        }

    });
});

function updateCalViews() {
    if (cal1Click) {
        document.getElementById("cal1_button").className = "clicked";
    } else {
        document.getElementById("cal1_button").className = "";
    }
    if (cal2Click) {
        document.getElementById("cal2_button").className = "clicked";
    } else {
        document.getElementById("cal2_button").className = "";
    }

    document.getElementById("calibrate_button").disabled = !(cal1Click && cal2Click);
}

function enableButtonFromCal1() {
    cal1Click = true;
    updateCalViews();
}

function enableButtonFromCal2() {
    cal2Click = true;
    updateCalViews();
}

// function updateTemp() {
//     var dataStop = {'cal_button': 'update', 'channel': currentChannel};
//     $.ajax({
//         type: "POST",
//         data: dataStop,
//         success: function (response) {
//             temp.value = parseFloat(response).toFixed(2);
//         }
//     });
// }

function updateSensor() {
    $.get("/sensor_data", {
        channel: currentChannel
    }, function (data) {
        document.getElementById("checkboxTemp").checked = data.active;
        document.getElementById("temp_button").disabled = !data.active;
        document.getElementById("temp").disabled = data.active;
        document.getElementById("temp").value = data.active ? data.temperature : data.default_temperature;
    });
}

function calcDeviation() {
    var dataStop = {'cal_button': 'deviation'};
    $.ajax({
        url: "/calibrate",
        type: "POST",
        data: dataStop,
        success: function (response) {
            Deviation.innerHTML = (parseFloat(response) / parseFloat(100)) * 100 + "%";
        }
    });

}

// function setValues() {
//     $.get("/calibrate_data", function (data) {
//         let channelData = data["chan" + currentChannel];
//         ph1.value = parseFloat(channelData["a"]).toFixed(2);
//         ph2.value = parseFloat(channelData["b"]).toFixed(2);
//         lastCalibrationLabel.innerHTML = channelData["date"];
//         temp.value = parseFloat(channelData["Tcal"]).toFixed(2);
//     });
//     cal1Click = false;
//     cal2Click = false;
//     updateCalViews();
//     document.getElementById("calibrate_button").disabled = true;
// }

// function updateTemperature() {
//     $.get("/calibrate_data", function (data) {
//         let channelData = data["chan" + currentChannel];
//         if (document.getElementById("checkboxTemp").checked) {
//             temp.value = parseFloat(channelData["Tcal"]).toFixed(2);
//             setTimeout(updateTemperature, 5000);
//         }
//     });
// }

// document.getElementById("checkboxTemp").addEventListener("click", function() {
//     checkboxTemperatureChange();
// });
//
// function checkboxTemperatureChange() {
//     let element = document.getElementById("checkboxTemp");
//     let labelTemp = document.getElementById("labelTemp");
//
//     if (element.checked) {
//         temp.disabled = true;
//         temp_button.disabled = true;
//         // updateTemperature();
//     } else {
//         temp.disabled = false;
//         temp_button.disabled = false;
//     }
// }

function openRecalibrateModal() {
    initCalibrate();

    document.getElementById("recalibrateModal").style.display = "flex";
}


document.getElementById("recalibrate").addEventListener("click", function () {
    // window.open("/calibrate", "", "height=410,width=450,location=0,menubar=0,status=0,titlebar=0,toolbar=0");
    openRecalibrateModal();
});

document.getElementById("closeRecalibrateModal").addEventListener("click", function () {
    closeRecalibrateModal();
});

document.getElementById("recalibrateModal").addEventListener("click", function (event) {
    if (event.target.id === "recalibrateModal") {
        closeRecalibrateModal();
    }
});

function closeRecalibrateModal() {
    document.getElementById("recalibrateModal").style.display = "none";
}

function updateLastCalibration() {
    $.get("/calibrate_time", function (data) {
        let lastCalibratonDate = data['calibration']['ph'][currentChannel+1]['date'];

        let elements = document.getElementsByClassName("lastCalibrationLabel");
        for (let i in elements) {
            elements[i].textContent = lastCalibratonDate;
        }
    });
}