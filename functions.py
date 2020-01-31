from flask import Flask
from flask import render_template
from flask import request
from datetime import datetime, timedelta
from time import strftime
from time import gmtime
import subprocess
from subprocess import Popen, PIPE
from subprocess import check_output
import os
import signal
import yaml
import json
import time
import copy
import sys
sys.path.append("/home/pi/physio-grad/software")
import piGrad.phControler as pig
config_file = "/home/pi/physio-grad/software/configuration.yaml"

from process import *

# process_manager = ProcessManager()
# process = {}
monitoring = []

def startMonitoring(channel):
    global monitoring

    monitoring.append(channel)


def stopMonitoring(channel):
    global monitoring
    monitoring.remove(channel)


def getMonitoring():
    global monitoring

    return monitoring

ADCs = [0,0]

def cal1Function(channel):
    channel = channel+1
    print("cal1")
    print("channel", channel)
    pig.path, pig.valves, pig.temp_paramas, pig.pH_params, pig.influx_client = pig.init(config_file, channel)
    ADCs[0] = pig.getValuesToCalibrate(channel, 30) #30s to calculate delata

def cal2Function(channel):
    channel = channel+1
    print("cal2")
    print("channel", channel)
    pig.path, pig.valves, pig.temp_paramas, pig.pH_params, pig.influx_client = pig.init(config_file, channel)
    ADCs[1] = pig.getValuesToCalibrate(channel, 30) #30s to calculate delata


def calibrateFunction(channel, ph1, ph2, temperature):
    channel = channel+1
    print("calibration")
    print("channel", channel)
    print(ph1)
    print(ph2)
    print(ADCs)
    print(temperature)
    pig.path, pig.valves, pig.temp_paramas, pig.pH_params, pig.influx_client = pig.init(config_file, channel)
    pig.Calibrate(config_file, channel, 1, ph1, ADCs[0], temperature)
    pig.Calibrate(config_file, channel, 2, ph2, ADCs[1], temperature)

def getSensorTemperature(channel) -> int:
    pig.path, pig.valves, pig.temp_paramas, pig.pH_params, pig.influx_client = pig.init(config_file, channel)
    _,temperature = pig.getActualValues(channel)
    return temperature


def getSensorData(channel):
    temperature = int(getSensorTemperature(channel+1))

    return {"active": (0 < temperature < 100), "temperature": temperature}


def loadSchedule(filename):
    try:
        with open(filename) as json_file:
            data = json.load(json_file)
            schedule = data["schedule"]
            print(schedule)
            data = [{"x": element["interval"] / 60, "y": element["pH"]} for element in schedule]
            return data
    except:
        return {}


def loadDataFromConfiguration():
    with open(config_file, 'r') as f:
        return yaml.safe_load(f)


def save_to_json(filename, chartname, chartdescription, schedule):
    name = chartname
    description = chartdescription

    JsonToPrint = {'name': name, 'description': description,
                   'schedule': [{'interval': data["x"], "pH": float(data["y"])} for data in
                                schedule]}
    print(JsonToPrint)
    with open(filename, 'w') as outfile:
        json.dump(JsonToPrint, outfile, indent=4)


def saveDataToConfFromCablibrateButton(request, data):
    now = datetime.now()
    dt_string = now.strftime('%d-%m-%Y %H:%M')
    data['calibration']['ph'][int(request.form["channel"])+1]['Tcal'] = float(request.form['temperature'])
    data['calibration']['ph'][int(request.form["channel"])+1]['pH1'] = float(request.form['ph1'])
    data['calibration']['ph'][int(request.form["channel"])+1]['pH2'] = float(request.form['ph2'])
    data['calibration']['ph'][int(request.form["channel"])+1]['date'] = dt_string
    with open(config_file, 'w') as f:
        yaml.dump(data, f)
    return dt_string


def getNumberOfChannels(data):
    return (len(data['calibration']['ph']) - 1)
