import time
import subprocess
import contextlib
import json
from typing import Optional
import sys

from schedule import *


class Process:
    def __init__(self, channel):
        self._channel = channel
        self._process = None
        self._stop = False
        self._pause = False

        self._schedule = None
        self._start_time = None
        self._pause_time = None

    def _kill_process(self):
        #self._process.kill()
        print("zabicie procesu")
        return True

    def _start_process(self):
        schedule_data = self._schedule.get_schedule()
        if self._pause and len(schedule_data) > 0:
            schedule_data[0].x = 999999999

        with open("schedule.json", "w+") as file:
            json.dump({
                "name": "last_schedule",
                "description": "last run schedule_data for one of channels",
                "schedule": schedule_data.get_output()
            }, file, indent=4)

        sleep_time = self._schedule.get_duration()
        if self._pause:
            sleep_time = 999999999
        bash_command = "sleep {}".format(sleep_time)

        print("proces został wystartowany")
        return True

    def wait_for_process(self):
        # try:
        #     _, _ = self._process.communicate()  # czekanie na ukończenie procesu
        #
        #     print("proces został ukończony")
        #     return True
        # except:
        #     print("Unexpected error:", sys.exc_info()[0])
        with contextlib.suppress(Exception):
            _, _ = self._process.communicate()  # czekanie na ukończenie procesu

            print("proces został ukończony")
            return True

    def is_alive(self):
        if self._stop:
            return False
        if self._pause:
            return True
        return time.time() - self._start_time < self._schedule.get_duration()

    def stop(self):
        self._stop = True

        self._kill_process()

    def pause(self):
        print("try pause")
        self._pause = True
        self._pause_time = time.time()

        self._kill_process()
        self.wait_for_process()

        self._schedule.set_offset_time(self._pause_time - self._start_time + self._schedule.get_offset_time())
        self._start_process()

        print("paused")

    def resume(self):
        print("try resume")
        self._pause = False

        self._kill_process()
        self.wait_for_process()

        self._start_time = time.time()
        self._start_process()

        print("resumed")

    def start(self, schedule):
        self._pause = False
        self._stop = False

        self._schedule = schedule
        self._start_time = time.time()
        self._start_process()
                   
    def get_process_info(self):
        return {
            "channel": self._channel,
            "alive": self.is_alive(),
            "pause": self._pause,
            "start_time": self._start_time, # czas wystartowania procesu (zmienia się po pauzie)
            "current_time": time.time(), # aktualny czas serwera (potrzebny do obliczenia różnicy czasu)
            "pause_time": self._pause_time, # czas wciśnięcia pauzy (myślę, że zbędny)

            "offset_time": self._schedule.get_offset_time(), # od początku ma 0 lub czas punktu od jakiego zaczynamy (zmienia się w momencie wciśnięcia pauzy o czas o ile został zatrzymany)
            "end_time": self._schedule.get_end_time() # ile sekund trwa cały proces
        }


class ProcessManager:
    def __init__(self):
        self.process_map = {}

    def is_process_start(self, channel):
        process = self.get_process(channel)
        return process is not None and not process._stop

    def get_process(self, channel) -> Optional[Process]:
        if not channel in self.process_map:
            return None
        return self.process_map[channel]

    def start_process(self, channel, schedule) -> Process:
        process = self.get_process(channel)
        if process is None:
            process = Process(channel)
            self.process_map[channel] = process
            workingDir = "/home/pi/physio-grad/software/"
            bashCommand = "./realizeScheduledPh.py %s %s" % ( channel+1, "/home/pi/physiolution_schedule_calibrate/schedule.json" )
            subprocess.Popen(bashCommand.split(), cwd=workingDir, stdout=subprocess.PIPE)

        process.start(schedule)
        return process

    def stop_process(self, channel):
        process = self.get_process(channel)
        if process is not None:
            process.stop()
            del self.process_map[channel]
        workingDir = "/home/pi/physio-grad/software/"
        bashCommand = "./stopRealizeScheduledPh.py %s" % (channel+1)
        subprocess.Popen(bashCommand.split(), cwd=workingDir, stdout=subprocess.PIPE)


    def pause_process(self, channel):
        process = self.get_process(channel)
        if process is not None:
            process.pause()
        workingDir = "/home/pi/physio-grad/software/"
        bashCommand = "./realizeScheduledPh.py %s %s" % ( channel+1, "/home/pi/physiolution_schedule_calibrate/schedule.json" )
        subprocess.Popen(bashCommand.split(), cwd=workingDir, stdout=subprocess.PIPE)


    def resume_process(self, channel):
        process = self.get_process(channel)
        if process is not None:
            process.resume()
        workingDir = "/home/pi/physio-grad/software/"
        bashCommand = "./realizeScheduledPh.py %s %s" % ( channel+1, "/home/pi/physiolution_schedule_calibrate/schedule.json" )
        subprocess.Popen(bashCommand.split(), cwd=workingDir, stdout=subprocess.PIPE)


    def wait_for_process(self, channel):
        process = self.get_process(channel)
        if process is None:
            return None
        process.wait_for_process()
        return process

    def get_process_list(self):
        data = {}
        for channel in self.process_map:
            process = self.process_map[channel]

            data[channel] = process.get_process_info()

        return data
