import copy


class ScheduleData:
    def __init__(self, data):
        self.data = data

    def __getitem__(self, item):
        return self.data[item]

    def __setitem__(self, key, value):
        self.data[key] = value

    def __len__(self):
        return len(self.data)

    def get_data(self):
        data = []

        offset = 0
        for point in self.data:
            offset += point.x
            data.append(SchedulePoint(offset, point.y))

        return data

    def get_output(self):
        return [{
            "interval": int(point.x),
            "pH": point.y
        } for point in self.data]


class SchedulePoint:
    def __init__(self, x, y):
        self.x = x
        self.y = y


class Schedule:
    def __init__(self, schedule):
        self.schedule = Schedule._convert_to_schedule(schedule)
        self.data = self.schedule.get_data()
        self.offset_time = 0

    def set_offset_index(self, index):
        self.offset_time = self.get_index_time(index)

    def set_offset_time(self, time):
        self.offset_time = time

    def get_end_time(self):
        if len(self.data) < 1:
            return 0
        return self.data[len(self.data) - 1].x

    def get_offset_time(self):
        return self.offset_time

    def get_duration(self):
        return self.get_end_time() - self.get_offset_time()

    def get_index_time(self, index) -> int:
        if index >= len(self.data):
            raise ValueError("Index is bigger than data length")
        return self.data[index].x

    def get_schedule(self) -> ScheduleData:
        schedule = copy.deepcopy(self.schedule.data)

        remaining = self.offset_time
        while remaining > 0 and len(schedule) > 0:
            if remaining - schedule[0].x >= 0:
                remaining -= schedule[0].x
                schedule = schedule[1:]
            else:
                schedule[0].x -= remaining
                remaining = 0

        return ScheduleData(schedule)

    @staticmethod
    def _convert_to_schedule(schedule) -> ScheduleData:
        return ScheduleData([SchedulePoint(point["x"] * 60, point["y"]) for point in schedule])
