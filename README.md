# physiolution_schedule_calibrate

The project aims to create an application that allows you to collect data from s
PhysioGrad (Physiolution GmbH), which is used to measure the temperature and pH of solutions and allows control of the valve assembly. The application should be optimized in terms of fast information processing and guarantee high availability, offer a web interface.
The application will be used in areas such as operation monitoring, collecting application metrics, sensor data, etc.

- https://ir.lib.uwo.ca/cgi/viewcontent.cgi?article=7069&context=etd
- https://ir.lib.uwo.ca/cgi/viewcontent.cgi?article=7069&context=etd
- http://flask.pocoo.org/

Repozytorium składa się z 3 głównych elementów:
- plik app.py - kod źródłowy aplikcji używającej Flask'a, obsługująca cały backend aplikacji,
- configuration.yaml - plik zawierającego wszystkie wartosci konfiguracyjne aplikacji,
- folder templates - zawiera on wszystkie szablony stron, które są potem przetwarzane przez Flaska.

Wszystkie skrypty używane przez aplikację są składowane w CDN, dlatego nie znajdują się w folderze lokalnie. Jednak wymaga to połączenia z internetem przy uruchomianiu aplikacji.
Używane skrypty to:
- Chart.js 
- jQuery
- Moment.js
- dragData.js

Do uruchomienia aplikaji będzie jednak potrzebne:
- Python 3.7
- przeglądarka internetowa
- Flask
- PyYaml

W celu uruchomienia aplikacji należy:
1. Repozytorium sklonować na dysk. 
2. Wejśc do głównego folderu, uruchomić konsolę i wpisać polecenie
"python app.py"

Zostanie wtedy uruchomiony serwer Flask i dostępne będą dwa widoki pod adresami:
- http://127.0.0.1:5000/ - strona do tworzenia harmonogramów przebiegu eksperymentu
- http://127.0.0.1:5000/calibrate - strona do kalibrowania urządzeń pomiarowych

Struktura plików
Pliki umieszczone w folderze templates mają do siebie zbliżoną strukturę - na samej górze załączone są skrypty, poniżej ewentualny kod stylu,
później umieszczona jest zawartość HTML, a na samym dole skrypty JavaScript. 

W pliku app.py na początku umieszczczone są importowane biblioteki, poniżej kontrolery dla określonych routingów, funkcje używane w kontrolerach. 




