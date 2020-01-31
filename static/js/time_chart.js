// Global parameters:
let selectedPoint = null;
let currentChannel = localStorage.getItem("current.channel");
if (currentChannel !== null) {
    currentChannel = parseInt(currentChannel);
} else {
    currentChannel = 0;
}
let channelData = {"name": "New workout", schedule: []};
let processInfo = {};
let animation = null;

let waitList = [];

function isWait(channel)
{
    return waitList.indexOf(channel) >= 0
}

function addWait(channel)
{
    waitList.push(channel);
}

function removeWait(channel)
{
    let index = waitList.indexOf(channel);
    if (index >= 0)
    {
        waitList.splice(index, 1)
    }
}

function getGrafanaUrl()
{
    let url = grafanaUrls[currentChannel + 1];
    if (url === undefined)
    {
        return grafanaUrls["default"];
    }
    return url;
}

function getChartName() {
    let name = channelData.name;
    if (!channelData.schedule || !isEqual(channelData.schedule, getSchedule())) {
        name += " (edited)";
    }
    return name;
}

function isLegendHidden() {
    return myChart.getDatasetMeta(0).hidden;
}

function setLegendHidden(value) {
    myChart.getDatasetMeta(0).hidden = value;
}

function isMonitoring() {
    return processInfo !== undefined && processInfo.monitoring !== undefined && processInfo["monitoring"].includes(currentChannel);
}

function isEqual(first, second) {
    if (first === second) {
        return true;
    }
    let isArray = Array.isArray(first) && Array.isArray(second);
    let isObject = typeof first === "object" && typeof second === "object";
    if (isObject || isArray) {
        for (let key in first) {
            if (!first.hasOwnProperty(key) || !second.hasOwnProperty(key)) {
                return false;
            }
            if (!isEqual(first[key], second[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
}

function waitAllProcess()
{
    Object.keys(processInfo).forEach(channel => {
        if (processInfo[channel].alive) {
            waitForKillProcess(channel);
        }
    });
}

function setProcessInfo(data) {
    processInfo = data;
    Object.keys(processInfo).forEach(channel => {
        processInfo[channel].data = {
            differenceTime: new Date().getTime() - (processInfo[channel].current_time * 1000)
        };
        // processInfo[channel].startTime = new Date().getTime();
    });
    waitAllProcess();
}

function setOneProcessInfo(data) {
    processInfo[data.channel] = data;
}

function setMonitoring(data) {
    if (!processInfo) {
        processInfo = {};
    }
    processInfo.monitoring = data;
}

let animationInterval = null;

// do not resize the chart canvas when its container does (keep at 600x400px)
Chart.defaults.global.responsive = true;

let table = document.getElementById("tblData");
let indexRow = table.rows[0];
let valueRow = table.rows[1];
let intervalRow = table.rows[2];
let timeRow = table.rows[3];

function getIndexFromTd(element) {
    return Array.from(element.parentNode.children).indexOf(element) - 1;
}

function getTd(row, index) {
    if (row.cells.length <= index) {
        let element = document.createElement("td");
        element.onclick = function (evt) {
            // if (evt.target.tagName === "INPUT") {
            //     return;
            // }
            let index = getIndexFromTd(element);
            if (evt.ctrlKey) {
                insertPointAfter(index);
            } else if (evt.shiftKey) {
                removePoint(index);
            } else {
                selectPoint(index);
            }
        };
        row.appendChild(element);
    }
    return row.cells[index];
}

function getInput(element, onChange) {
    if (element.firstChild === null) {
        let input = generateInput(onChange);
        element.appendChild(input);
        return input;
    }
    if (element.firstChild.tagName === "INPUT") {
        return element.firstChild;
    } else {
        element.firstChild.remove();
        return getInput(element, onChange);
    }
}

function generateInput(onChange) {
    let input = document.createElement("input");
    input.className = "time-input";
    input.size = "1";
    input.type = "text";
    input.onchange = function (event) {
        if (onChange) {
            onChange.apply(this, arguments);
        }

        let index = getIndexFromTd(input.parentNode);
        updatePoint(index);
    };
    return input;
}

function setIndex(index, value) {
    let element = getTd(indexRow, index);
    element.className = index - 1 === selectedPoint ? "active" : "";
    element.textContent = value;
}

function setValue(index, value) {
    let element = getTd(valueRow, index);
    element.className = index - 1 === selectedPoint ? "active" : "";
    let input = getInput(element, (event) => {
        if (event.target.value <= 0 || event.target.value > 14) {
            updateTable();
            alert("Invalid data provided");
            return;
        }
        updateChart(() => convertSchedule(parseSchedule()));
    });
    input.value = value;
    input.disabled = isProcessAlive(currentChannel) || isLegendHidden();
}

function setIntervalValue(index, value) {
    let element = getTd(intervalRow, index);
    element.className = index - 1 === selectedPoint ? "active" : "";
    let input = getInput(element, (event) => {
        if (!isTimeValid(event.target.value)) {
            updateTable();
            alert("Invalid data provided");
            return;
        }
        updateChart(() => convertSchedule(parseSchedule()));
    });
    input.value = value;
    input.disabled = isProcessAlive(currentChannel) || isLegendHidden();
}

function setTime(index, value) {
    let element = getTd(timeRow, index);
    element.className = index - 1 === selectedPoint ? "active" : "";
    let input = getInput(element, () => {
        if (!isTimeValid(event.target.value)) {
            updateTable();
            alert("Invalid data provided");
            return;
        }
        updateChart(() => parseData());
    });
    input.value = value;
    input.disabled = isProcessAlive(currentChannel) || isLegendHidden();
}

function removeExcess(row) {
    let data = getData();
    while (data.length < row.cells.length - 1) {
        row.cells[row.cells.length - 1].remove();
    }
}

function timeFromMinutes(minutes) {
    return newDateString(Math.floor(minutes / 60), Math.round(minutes % 60));
}

function isTimeValid(value) {
    if (value.length !== 5) {
        return false;
    }
    if (value.charAt(2) !== ':') {
        return false;
    }
    for (let i = 0; i < value.length; i++) {
        if (i === 2) {
            continue;
        }
        let charCodeAt = value.charCodeAt(i);
        if (charCodeAt < 48 || charCodeAt > 57) {
            return false;
        }
    }
    return true;
}

function newDateString(hours, minutes) {
    return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0");
}

function parseTimeToMinutes(value) {
    let split = value.split(":");
    let hours = Math.max(parseInt(split[0] * 60), 0);
    let minutes = Math.max(parseInt(split[1]), 0);
    return hours + minutes;
}

function insertPointAfter(index) {
    if (isProcessAlive(currentChannel)) {
        alert("You can not insert point for current channel, because channel is alive!");
        return;
    }

    let schedule = getSchedule();
    let point = schedule[index];
    schedule.splice(index + 1, 0, {
        y: point.y,
        x: point.x
    });

    setData(convertSchedule(schedule));
    updateTable();
}

function setData(data) {
    // if (isSelectedChannelAlive()) {
    //     return false;
    // }
    myChart.data.datasets[0].data = data;
    updateData();
}

function getData() {
    return myChart.data.datasets[0].data;
}

function getSchedule() {
    return convertData(getData());
}

// function getScheduleFromSelected() {
//     return convertDataFromSelected(getData());
// }

function updateData() {
    myChart.data.datasets[0].label = getChartName();
    // myChart.data.datasets[0].backgroundColor = isProcessAlive(currentChannel) ? "rgba(255, 255, 255, 0.4)" : "rgba(75, 192, 192, 0.4)";
    // myChart.data.datasets[0].borderColor = isProcessAlive(currentChannel) ? "rgb(200, 200, 200)" : "rgb(75, 192, 192)";
    myChart.update();

    if (isProcessPaused(currentChannel))
    {
        myChart.data.datasets[0].backgroundColor = generateGradient("rgba(255, 215, 96, 0.4)", "rgba(255, 255, 255, 0.4)");
        myChart.data.datasets[0].borderColor = generateGradient("rgb(255, 215, 96)", "rgb(200, 200, 200)");
    }
    else {
        myChart.data.datasets[0].backgroundColor = generateGradient("rgba(75, 192, 192, 0.4)", "rgba(255, 255, 255, 0.4)");
        myChart.data.datasets[0].borderColor = generateGradient("rgb(75, 192, 192)", "rgb(200, 200, 200)");
    }

    // for (let i = 0; i < myChart.tooltip.length; i++)
    // {
    //     myChart.tooltip[i].hidden = true;
    // }
    // // myChart.tooltip._active = [];
    // //
    // myChart.tooltip._eventPosition = {0, 0};

    myChart.options.tooltips.enabled = !isSelectedChannelAlive();
    myChart.update();
}

function clearData() {
    selectedPoint = null;

    setData([]);
    updateTable();
}

function convertSchedule(schedule) {
    let data = [];
    var actualTime = 0;
    for (var i = 0; i < schedule.length; i++) {
        actualTime += schedule[i].x;
        data.push({
            x: actualTime,
            y: parseFloat(schedule[i].y)
        });
    }
    return data;
}

function convertData(data) {
    let schedule = [];
    let lastValue = 0;
    for (let i = 0; i < data.length; i++) {
        let point = data[i];
        let currentInterval = Math.max(point.x - lastValue, 1);
        schedule.push({
            y: parseFloat(point.y),
            x: currentInterval
        });
        lastValue = point.x;
    }
    return schedule;
}

// function convertDataFromSelected(data) {
//     let schedule = [];
//     let lastValue = data[selectedPoint].x;
//     console.log("last value " + lastValue);
//
//     for (let i = selectedPoint + 1; i < data.length; i++) {
//         let point = data[i];
//         let currentInterval = Math.max(point.x - lastValue, 1);
//         console.log("currentInterval " + currentInterval);
//         schedule.push({
//             y: point.y,
//             x: currentInterval
//         });
//         lastValue = point.x;
//     }
//     return schedule;
// }

function updateChart(functionToParse) {
    // if (isSelectedChannelAlive()) {
    //     updateTable();
    //     updateData();
    //     return false;
    // }
    let data = functionToParse();
    setData(data);
    saveChannel();
}

// function updateRecalibrateButton() {
//     $.get("/calibrate_time", function (data) {
//         document.getElementById("lastCalibrationLabel").textContent = data['calibration']['ph']['chan' + (currentChannel + 1)]['date'];
//
//         setTimeout(updateRecalibrateButton, 2000);
//     });
// }

function updateTable() {
    console.log("UPDATE TABLE");

    let data = getData();
    let schedule = convertData(data);
    for (let i = 0; i < schedule.length; i++) {
        let point = schedule[i];
        setIndex(i + 1, i + 1);
        setValue(i + 1, point.y);
        setIntervalValue(i + 1, timeFromMinutes(point.x));
        setTime(i + 1, timeFromMinutes(data[i].x));
    }
    removeExcess(indexRow);
    removeExcess(valueRow);
    removeExcess(intervalRow);
    removeExcess(timeRow);

    document.getElementById("managePoints").className = selectedPoint !== null ? "active" : "";
    document.getElementById("tblData").className = (isSelectedChannelAlive() || isLegendHidden()) ? "disabled" : "";
    let realAlive = isProcessAlive(currentChannel);
    let alive = realAlive || isMonitoring();
    document.getElementById("start_selected").hidden = alive || selectedPoint === null;

    saveChannel();
}

function updatePoint(i) {
    let data = getData();

    let lastValue = i > 0 ? data[i - 1].x : 0;
    let point = data[i];
    setIndex(i + 1, i + 1);
    setValue(i + 1, point.y);
    setIntervalValue(i + 1, timeFromMinutes(point.x - lastValue));
    setTime(i + 1, timeFromMinutes(point.x));
    saveChannel();
}

function removePoint(index) {
    if (isProcessAlive(currentChannel)) {
        alert("You can not remove point for current channel, because channel is alive!");
        return;
    }
    var schedule = getSchedule();
    schedule.splice(index, 1);
    setData(convertSchedule(schedule));
    updateTable();
}

// define the chart data
var chartData = {
        datasets: [{
            label: legend,
            fill: true,
            lineTension: 0.1,
            backgroundColor: "rgba(75,192,192,0.4)",
            borderColor: "rgba(75,192,192,1)",
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgba(75,192,192,1)",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgba(75,192,192,1)",
            pointHoverBorderColor: "rgba(220,220,220,1)",
            pointHoverBorderWidth: 2,
            pointRadius: 5,
            pointHitRadius: 10,
            data: 0,
            spanGaps: false,
            steppedLine: 'after',
            responsive: true
        }]
    }
;

// get chart canvas
let holder = document.getElementById("myChart");
let ctx = document.getElementById("myChart").getContext("2d");
// let progress = document.getElementById('animationProgress');
// let processStop = false;

function generateGradient(firstColor, secondColor) {
    let data = myChart.getDatasetMeta(0).data;
    let right = data.length > 0 ? data[data.length - 1]._view.x : 0;
    // console.log(right - );
    let maxX = Math.max(right - myChart.chartArea.left, 0);

    let time;
    let maxTime;
    if (animation !== null) {
        time = getProcessTime(animation);
        maxTime = getProcessMaxTime(animation);
    } else {
        time = 1;
        maxTime = 1;
    }

    let x = (0.003 + (time / maxTime)) * maxX;

    let gradient = ctx.createLinearGradient(myChart.chartArea.left + x, 0, myChart.chartArea.left + x + 1, 0);
    gradient.addColorStop(0, firstColor);
    gradient.addColorStop(1, secondColor);

    return gradient;
}

let gradientStroke = ctx.createLinearGradient(500, 0, 100, 0);
gradientStroke.addColorStop(0, '#80b6f4');

gradientStroke.addColorStop(1, '#f49080');

window.oncontextmenu = function (evt) {
    if (evt.target === holder) {
        return false;
    }
};

document.addEventListener('keyup', function (e) {
    if (e.keyCode === 27) {
        myChart.resetZoom();
    }
    if (e.keyCode === 13) {
        var selectedTemplate = $("#templatesList:focus").children("option:selected").val();
        if (selectedTemplate) {
            loadTemplateFromFile(selectedTemplate);
        }
    }
});


document.getElementById("openModal").addEventListener("click", function () {
    document.getElementById("modal").style.display = "flex";
});
document.getElementById("closeModal").addEventListener("click", function () {
    closeModal();
});
document.getElementById("modal").addEventListener("click", function (event) {
    if (event.target.id === "modal") {
        closeModal();
    }
});

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

function getOffsetTop(elem) {
    let offsetTop = 0;
    do {
        if (!isNaN(elem.offsetTop)) {
            offsetTop += elem.offsetTop;
        }
    } while (elem = elem.offsetParent);
    return offsetTop;
}

function updateGrafana() {
    let url = new URL(getGrafanaUrl());
    let params = url.searchParams;
    if (isMonitoring()) {
         params.set("from", "now-15m");
         params.set("to", "now");
         params.set("kiosk", "tv");
         params.set("refresh", "3s");

        if (url.toString() !== document.getElementById("grafana").src) {
            document.getElementById("grafana").src = url.toString();
        }
        showGrafana();
    } else if (isSelectedChannelAlive()) {
        let process = processInfo[currentChannel];

        let time = getProcessTime(process);
        let maxTime = getProcessMaxTime(process);

//        params.set("from", (new Date().getTime() - time).toFixed(0));
//		  params.set("to", (new Date().getTime() - time + maxTime + 60000).toFixed(0));

        if (url.toString() !== document.getElementById("grafana").src) {
            document.getElementById("grafana").src = url.toString();
        }
        showGrafana();
    } else if (!isMonitoring()) {
        hideGrafana();
    }
}

function showGrafana() {
    let display = document.getElementById("grafana-container").style.display;
    document.getElementById("grafana-container").style.display = "block";
    if (display !== "block") {
        document.scrollingElement.scrollTop = getOffsetTop(document.getElementById("grafana"));
    }
}

function hideGrafana() {
    document.getElementById("grafana-container").style.display = "none";
}

document.getElementById("startMonitoring").addEventListener("click", function () {
    $.ajax({
        url: "/start_monitoring",
        type: "POST",
        success: function (data) {
            setMonitoring(data);
            updateButtons();
        },
        contentType: "application/json",
        data: JSON.stringify({channel: currentChannel})
    });
});

document.getElementById("stopMonitoring").addEventListener("click", function () {
    $.ajax({
        url: "/stop_monitoring",
        type: "POST",
        success: function (data) {
            setMonitoring(data);
            setLegendHidden(false);
            updateButtons();

        },
        contentType: "application/json",
        data: JSON.stringify({channel: currentChannel})
    });
});


document.getElementById("start").addEventListener("click", function () {
    if (isAnyCheckedProcessAlive()) {
        alert("Can not to start process for already alive channel");
        return;
    }
    if (isLegendHidden()) {
        return;
    }

    let checkedChannels = getCheckedChannels();
    $.ajax({
        url: "/start_button",
        type: "POST",
        success: function (data) {
            saveChannels(checkedChannels);
            setProcessInfo(data);
            updateButtons();
        },
        contentType: "application/json",
        data: JSON.stringify({"schedule": getSchedule(), "channels": checkedChannels})
    });
});

document.getElementById("start_selected").addEventListener("click", function () {
    if (isAnyCheckedProcessAlive()) {
        alert("Can not to start process for already alive channel");
        return;
    }
    if (isLegendHidden()) {
        return;
    }
    if (selectedPoint === null) {
        return;
    }

    let checkedChannels = getCheckedChannels();
    $.ajax({
        url: "/start_selected_button",
        type: "POST",
        success: function (data) {
            saveChannels(checkedChannels);
            setProcessInfo(data);
            updateButtons();
        },
        contentType: "application/json",
        data: JSON.stringify({"schedule": getSchedule(), "channels": checkedChannels, "selected_point": selectedPoint})
    });
});

document.getElementById("stop").addEventListener("click", function () {
    if (isLegendHidden()) {
        return;
    }
    $.ajax({
        url: "/stop_button",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"channels": getCheckedChannels()}),
        success: function (data) {
            setProcessInfo(data);
            updateButtons();
        }
    });
});

document.getElementById("pause").addEventListener("click", function () {
    if (isLegendHidden()) {
        return;
    }
    $.ajax({
        url: "/pause_button",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"channel": currentChannel}),
        success: function (data) {
            setProcessInfo(data);
            updateButtons();
        }
    });
});

document.getElementById("resume").addEventListener("click", function () {
    if (isLegendHidden()) {
        return;
    }
    $.ajax({
        url: "/resume_button",
        type: "POST",
        success: function (data) {
            setProcessInfo(data);
            updateButtons();
        },
        contentType: "application/json",
        data: JSON.stringify({"channel": currentChannel})
    });
});

document.getElementById("add").addEventListener("click", function () {
    let schedule = getSchedule();
    let x = schedule.length > 0 ? schedule[schedule.length - 1].x : 7;
    let y = schedule.length > 0 ? schedule[schedule.length - 1].y : 10;
    schedule.push({
        y: y,
        x: x
    });
    setData(convertSchedule(schedule));
    updateTable();
});

document.getElementById("addAfterPoint").addEventListener("click", function () {
    if (selectedPoint !== null) {
        insertPointAfter(selectedPoint);
    }
});

document.getElementById("removePoint").addEventListener("click", function () {
    if (selectedPoint !== null) {
        removePoint(selectedPoint);
    }
});

document.getElementById("loadTemp").addEventListener("click", function () {
    var selectedTemplate = $("#templatesList").children("option:selected").val();
    if (!selectedTemplate) {
        alert("You have to choose file");
        return;
    }
    loadTemplateFromFile(selectedTemplate);
});

document.getElementById("templatesList").ondblclick = function () {
    var selectedTemplate = $("#templatesList").children("option:selected").val();
    loadTemplateFromFile(selectedTemplate);
};

document.getElementById("deleteTemp").addEventListener("click", function () {
    var selectedTemplate = $("#templatesList").children("option:selected").val();
    if (!selectedTemplate) {
        alert("You have to choose file");
    }
    deleteTemplate(selectedTemplate);
});

document.getElementById("saveTemplate").addEventListener("click", function () {
    saveTemplate();
});


function setStyle(ctx, vm) {
    ctx.lineCap = vm.borderCapStyle;
    ctx.setLineDash(vm.borderDash);
    ctx.lineDashOffset = vm.borderDashOffset;
    ctx.lineJoin = vm.borderJoinStyle;
    ctx.lineWidth = vm.borderWidth;
    ctx.strokeStyle = vm.borderColor;
    ctx.fillStyle = vm.backgroundColor;
}

Chart.controllers.customLine = Chart.controllers.line;
var customLine = Chart.controllers.line.extend({
    draw: function () {
        let meta = this.getMeta();
        let me = meta.dataset;
        let vm = me._view;
        let ctx = this.chart.ctx;
        let points = me._children;

        if (!points.length) {
            return;
        }

        let data = meta.data;
        if (data.length > 0 && data[0]._view.x !== 0 && data[0]._view.x >= 0) {
            let point = points[0]._view;

            ctx.save();

            setStyle(ctx, vm);

            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(this.chart.chartArea.left, point.y);
            ctx.fillRect(this.chart.chartArea.left, point.y, point.x - this.chart.chartArea.left, this.chart.chartArea.bottom - point.y);
            ctx.stroke();
            ctx.restore();
        }
        let point = selectedPoint !== null && selectedPoint < points.length ? points[selectedPoint] : null;
        let backgroundColor;
        if (point !== null) {
            backgroundColor = vm.backgroundColor;
            point._view.backgroundColor = "rgb(255, 0, 0)";
        }
        Chart.controllers.line.prototype.draw.apply(this, arguments);
        if (point !== null) {
            point._view.backgroundColor = backgroundColor;
        }
        // console.log(arguments);
    }
});
Chart.controllers.customLine = customLine;

// create the chart using the chart canvas
var myChart = new Chart(ctx, {
    type: 'customLine',
    data: chartData,
    options: {
        legend: {
            display: true,
            labels: {
                fontSize: 18
            },
            onClick: function (e, legendItem) {
                if (isSelectedChannelAlive() || isMonitoring()) {
                    return;
                }

                var index = legendItem.datasetIndex;
                var ci = this.chart;
                var alreadyHidden = (ci.getDatasetMeta(index).hidden === null) ? false : ci.getDatasetMeta(index).hidden;
                ci.getDatasetMeta(index).hidden = !alreadyHidden;

                ci.update();

                updateButtons();
            }
        },
        dragData: true,
        dragX: true,
        dragDataRound: 2,
        onDragStart() {
            if (isSelectedChannelAlive()) {
                return false;
            }
        },
        onDrag: function (event, datasetIndex, index, value) {
            let data = myChart.data.datasets[datasetIndex].data;
            if (value.y <= 0) {
                value.y = 0.01;
            }
            if (value.x <= 0) {
                value.x = 1;
            }
            value.x = Math.round(value.x);
            if (index > 0 && data[index - 1].x >= value.x) {
                value.x = data[index - 1].x + 1;
            } else if (index < data.length - 1 && data[index + 1].x <= value.x) {
                value.x = data[index + 1].x;
            }
            updatePoint(index);
            updateChart(() => convertSchedule(parseSchedule()));
        },
        onDragEnd: function (e, datasetIndex, index, value) {
            updatePoint(index);
            updateChart(() => convertSchedule(parseSchedule()));
        },
        scales: {
            yAxes: [{
                ticks: {
                    max: 14,
                    min: 0,
                    stepSize: 1.0,
                    callback: function (value) {
                        return Math.round(value) + " pH"
                    }
                },
                gridLines: {
                    color: "rgba(255, 255, 255, 0.25)",
                }
            }],
            xAxes: [{
                type: "linear",
                ticks: {
                    precision: 0,
                    beginAtZero: true,
                    min: 0,
                    userCallback: function (label, index, labels) {
                        if (Math.round(label) === label) {
                            return timeFromMinutes(label);
                        }
                    }
                },
                gridLines: {
                    color: "rgba(255, 255, 255, 0.25)",
                }
            }]
        },
        tooltips: {
            enabled: true,
            mode: 'nearest',
            intersect: true,
            callbacks: {
                title: function (tooltipItems, data) {
                    let item = tooltipItems[0];
                    return "Index: " + (item.index + 1) + "\nInterval: " + timeFromMinutes(getSchedule()[item.index].x) + " [hh:mm]";
                },
                label: function (tooltipItems, data) {
                    return tooltipItems.yLabel + " pH";
                },
                footer: function () {
                    return "(CTRL + Left Mouse Button to add point)\n(SHIFT + Left Mouse Button to delete point)"
                }
            },
            animationDuration: 0
        },
        plugins: {
            zoom: {
                zoom: {
                    enabled: true,
                    mode: "x",
                    drag: true
                }
            }
        }
    }
});
// create a callback function for updating the selected index on the chart
holder.onclick = function (evt) {
    console.log(evt);
    var activePoint = myChart.getElementAtEvent(evt);
    if (activePoint.length > 0 && evt.ctrlKey) {
        insertPointAfter(activePoint[0]._index);
    } else if (activePoint.length > 0 && evt.shiftKey) {
        removePoint(activePoint[0]._index);
    } else if (activePoint.length > 0) {
        selectPoint(activePoint[0]._index);
    }
};

function selectPoint(index) {
    let element = indexRow.cells[index + 1];
    let parentTable = element.parentNode.parentNode.parentNode.parentNode;
    parentTable.scrollLeft = element.offsetLeft - (parentTable.clientWidth / 2);

    selectedPoint = index;
    updateTable();
    updateData();
}


function getProcessTime(process) {
    if (process.pause) {
        return process.offset_time * 1000;
    }
    return process.offset_time * 1000 + (new Date().getTime() - process.start_time * 1000 - process.data.differenceTime)
    // return new Date().getTime() - (animation.start_time * 1000) + animation.data.differenceTime;
    // let time = new Date().getTime()
    // let time = (animation.process.start) * 1000;
    // if (!animation.pause) {
    //     time += (new Date().getTime() - animation.startTime);
    // }
    // return time;
}

function getProcessMaxTime(process) {
    return process.end_time * 1000;
}

function animationStart(process) {
    resetAnimation();

    animation = process;

    animationInterval = window.setInterval(function () {
        let time = getProcessTime(animation);
        let maxTime = getProcessMaxTime(animation);
        let progress = (time / maxTime);
        // progress.value = 0.003 + (time / maxTime);
        updateData();
        if (progress >= 1) {
            stopAnimation();
        }
    }, 10);
}

function stopAnimation() {
    console.log("stop");
    animationInterval !== null && clearInterval(animationInterval);
}

function resetAnimation() {
    stopAnimation();
    animation = null;
    updateData();
    // progress.value = 0;
}

function createChannelButton(index, id, onchange) {
    let button = document.createElement("button");
    button.textContent = "channel" + (index + 1);
    button.onclick = onchange;
    button.id = id;


    return button;
}

function createChannelInput(divId, index, id, type, name, onchange) {
    let node = document.createElement('div');
    node.id = divId;
    let input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.name = name;
    let label = document.createElement("label");
    label.setAttribute("for", input.id);
    label.textContent = "channel" + (index + 1);

    input.onchange = onchange;

    node.appendChild(input);
    node.appendChild(label);

    return node;
}

function selectChannel(index) {
    currentChannel = index;
    console.log("select channel " + index);
    localStorage.setItem("current.channel", index);
    loadChannel(index);

    setLegendHidden(false);
    startGrafana = false;
    // updateGrafana();
    updateButtons();

    updateLastCalibration();
}

function getCheckedChannels() {
    let checked = [];
    let checkboxes = document.getElementById("channelCheckboxes").getElementsByTagName("input");

    for (let i = 0; i < numberOfChannels; i++) {
        if (checkboxes[i].checked) {
            checked.push(i);
        }
    }
    return checked;
}

function loadListOfTemplates() {
    $.get("/schedules", function (data) {
        $('#templatesList').children('option').remove();

        var files = data;
        console.log(files);

        var list = document.getElementById("templatesList");

        for (let file in files) {
            var option = document.createElement("option");
            option.innerHTML = files[file];

            console.log(files[file]);
            list.add(option);
        }
    });
}

function loadTemplateFromFile(selectedTemplate) {
    if (isSelectedChannelAlive()) {
        alert("You can not load template for current channel, because channel is alive!");
        return;
    }
    if (getData().length > 0 && !confirm("Are you sure you want to load the new template? The current chart will be replaced.")) {
        return;
    }
    $.get("/getTemplateSchedule", {templateName: selectedTemplate}).done(function (data) {
        let schedule = data.schedule;

        channelData.name = selectedTemplate;
        channelData.schedule = schedule;

        setLegendHidden(false);
        closeModal();

        clearData();
        setData(convertSchedule(schedule));
        updateTable();
    });
}

function deleteTemplate(selectedTemplate) {
    $.get("/deleteTemplate", {templateName: selectedTemplate});
    loadListOfTemplates();
}


function saveTemplate() {
    templateName = prompt("Name of template");
    if (!templateName || templateName === "") {
        alert("Invalid name of template");
        return;
    }
    templateDescription = prompt("Description of template");
    $.ajax({
        url: "/saveTemplate",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({schedule: getSchedule(), name: templateName, description: templateDescription})
    });
    loadListOfTemplates();

    channelData.name = templateName + ".json";
    channelData.schedule = getSchedule();
    updateData();


}

function loadChannel(index) {
    console.log("LOAD CHANNEL " + index);
    let item = localStorage.getItem("channel." + index);

    clearData();
    if (!item) {
        return;
    }
    console.log(item);
    let data = JSON.parse(item);
    if (data.data === undefined || data.schedule === undefined) {
        data.data = channelData;
        data.schedule = data;
    }
    channelData = data.data;
    setData(convertSchedule(data.schedule));
    updateTable();
}

function saveChannel() {
    saveChannels([currentChannel])
}

function saveChannels(channels) {
    for (let i in channels) {
        localStorage.setItem("channel." + channels[i], JSON.stringify({
            "schedule": getSchedule(),
            "data": channelData
        }));
    }
}

function isSelectedChannelAlive() {
    return isProcessAlive(currentChannel);
}

function isProcessAlive(channel) {
    return (processInfo[channel] !== undefined && processInfo[channel].alive);
}

function isProcessPaused(channel) {
    return processInfo[channel] !== undefined && processInfo[channel].pause && isProcessAlive(channel);
}

function isAnyCheckedProcessAlive() {
    let channels = getCheckedChannels();
    for (let key in channels) {
        console.log("channel id " + channels[key]);
        if (isProcessAlive(channels[key])) {
            return true;
        }
    }
    return false;
}

function updateButtons() {
    if (isMonitoring()) {
        setLegendHidden(true);
    }

    updateGrafana();
    if (isLegendHidden()) {
        document.getElementById("monitoringContainer").classList.remove("hidden");
        document.getElementById("startContainer").classList.add("hidden");
    } else {
        document.getElementById("monitoringContainer").classList.add("hidden");
        document.getElementById("startContainer").classList.remove("hidden");
    }
    document.getElementById("startMonitoring").hidden = isMonitoring();
    document.getElementById("stopMonitoring").hidden = !isMonitoring();


    let realAlive = isProcessAlive(currentChannel);
    let isPaused = isProcessPaused(currentChannel);
    let alive = realAlive || isMonitoring();
    document.getElementById("start").hidden = alive;
    document.getElementById("start_selected").hidden = alive || selectedPoint === null;
    document.getElementById("stop").hidden = !alive;
    document.getElementById("pause").hidden = !alive || isPaused;
    document.getElementById("resume").hidden = !isPaused;
    // document.getElementById("outerProgress").className = realAlive ? "outerProgress start" : "outerProgress";

    document.getElementById("channelCheckTitle").textContent = alive ? "Stop this schedule for channels:" : "Start this schedule for channels:";

    let buttons = document.getElementById('channelButtons');
    let checkboxes = document.getElementById('channelCheckboxes');
    buttons.innerHTML = "";
    checkboxes.innerHTML = "";
    for (let i = 0; i < numberOfChannels; i++) {
        let channelButton = createChannelButton(i, "channel" + i, function () {
            selectChannel(i);
        });
        buttons.appendChild(channelButton);
        let checkDiv = createChannelInput("checkDiv" + i, i, "check" + i, "checkbox", "check");
        checkboxes.appendChild(checkDiv);

        let processAlive = isProcessAlive(i);
        if ((alive && processAlive) || (!alive && !processAlive)) {
            checkDiv.className = "";
            if (!alive && processAlive) {
                checkDiv.children[0].checked = true;
                checkDiv.children[0].disabled = true;
            }
        } else {
            checkDiv.className = "running";
            checkDiv.children[0].disabled = true;
            checkDiv.children[1].textContent = checkDiv.children[1].textContent + (processAlive ? " (running)" : " (not running)");
        }

        if (i === currentChannel) {
            channelButton.classList.add("active");
        }
        if (processAlive) {
            channelButton.classList.add("running");
        }
    }
    document.getElementById("check" + currentChannel).checked = true;
    document.getElementById("check" + currentChannel).disabled = true;

    resetAnimation();
    if (realAlive || isPaused) {
        let process = processInfo[currentChannel];
        animationStart(process);
    }

    updateData();
    updateTable();

    document.getElementById("add").disabled = alive || isLegendHidden();
    document.getElementById("addAfterPoint").disabled = alive || isLegendHidden();
    document.getElementById("removePoint").disabled = alive || isLegendHidden();
    document.getElementById("saveTemplate").disabled = alive || isLegendHidden();
    document.getElementById("loadTemp").disabled = alive || isLegendHidden();
    document.getElementById("deleteTemp").disabled = alive || isLegendHidden();
    document.getElementById("recalibrate").disabled = alive;
    document.getElementById("openModal").disabled = alive || isLegendHidden();
}

function waitForKillProcess(channel) {
    channel = parseInt(channel);
    if (isWait(channel)) {
        return;
    }
    addWait(channel);
    if (isProcessAlive(channel)) {
        $.ajax({
            url: "/wait_process",
            type: "POST",
            success: function (data) {
                console.log("remove " + channel);
                removeWait(channel);

                setProcessInfo(data);
                updateButtons();
            },
            error: function() {
                removeWait(channel);
                // waitAllProcess();
            },
            contentType: "application/json",
            data: JSON.stringify({"channel": channel})
        });
    }
}

function onStart() {
    selectChannel(currentChannel);
    $.get("/process_alive", function (data) {
        //TODO monitoring
        console.log(data.monitoring);
        console.log(data.monitoring.includes(currentChannel));
        startGrafana = data.monitoring.includes(currentChannel);

        // processInfo = data;
        setProcessInfo(data);
        updateButtons();
    });
    loadListOfTemplates();

    // updateRecalibrateButton();
}

function parseSchedule() {
    var schedule = [];

    var n = table.rows[0].cells.length;
    for (var i = 1; i < n; i++) {
        let point = {
            x: Math.max(parseTimeToMinutes(table.rows[2].cells[i].children[0].value), 1),
            y: parseFloat(table.rows[1].cells[i].children[0].value).toFixed(2)
        };
        schedule.push(point);
    }
    return schedule;
}

function parseData() {
    var data = [];

    let lastTime = 0;
    var n = table.rows[0].cells.length;
    for (var i = 1; i < n; i++) {
        let parsedTime = parseTimeToMinutes(table.rows[3].cells[i].children[0].value);
        let point = {
            x: lastTime >= parsedTime ? lastTime + 1 : parsedTime,
            y: parseFloat(table.rows[1].cells[i].children[0].value).toFixed(2)
        };
        data.push(point);
        lastTime = point.x;
    }
    return data;
}
