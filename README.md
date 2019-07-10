# DAF Kafka Consumer for Piattaforma Digitale Nazionale Dati (PDND), previously DAF

The DAF Kafka Consumer is a backend component with the aim to consume all messages written in the kafka topics to create 
new datasets and notifications for PDND.


## What is the PDND (previously DAF)?

PDND stays for "Piattaforma Digitale Nazionale Dati" (the Italian Digital Data Platform), previously known as Data & Analytics Framework (DAF).

You can find more informations about the PDND on the official [Digital Transformation Team website](https://teamdigitale.governo.it/it/projects/daf.htm).

## What is DAF Kafka Consumer?


DAF Kafka Consumer is a backend component based on NodeJS. The aim of this component is to listen 
the input of a new message in two different kafka topics,*creationfeed* and *notifications*, 
and process the messages to (in order) create a new dataset and insert a specific notification.


All the active code is available in the file `serverNew.js` on the **master** branch. To add new feature create a new _feature branch_ from 
master. 
### Tools references

This project references the following tools.

* [Apache Kafka](https://kafka.apache.org/)

### Project components

This project depends by the following components.

* **NodeJS** version 8.16.0, available [here](https://nodejs.org/dist/v8.16.0/).

### Related PDND Services

* **DAF Catalog Manager** available [here](https://github.com/italia/daf-srv-catalog/tree/master)
* **DAF Security Manager** available [here](https://github.com/italia/daf-srv-security/tree/master)
* **DAF Dataportal Backend** available [here](https://github.com/italia/daf-dataportal-backend)

## How to install and use DAF Kafka Consumer

> Insert here a brief documentation to use this project as an end-user (not a developer) if applicable, including pre-requisites and internal and external dependencies. Insert a link to an extended documentation (user manual) if present.

### Clone the project 
```
git clone https://github.com/italia/daf-kafka-consumer.git
```

### Configure your local environment
To make the magic happen are required:
- Node.JS
- NPM

You can install them following [this guide](https://nodejs.org/en/download/package-manager/)

### Install all packages and dependencies
```
npm install
```

### Run the app
```
node serverNew.js
```

To make the component work you need to have a running Kafka service and configure the correct _Zookeeper_ 
connection to Kafka
## How to build and test DAF Kafka Consumer

<!--> Insert here a brief documentation for the developer to build, test and contribute. Insert a link to an extended documentation (developer manual) if present.-->
To build the component you can use Docker:
```
sudo docker build --no-cache -t <YOUR_DOCKER_IMAGE_NAME> .
```

## How to contribute

Contributions are welcome. Feel free to [open issues](./issues) and submit a [pull request](./pulls) at any time, but please read [our handbook](https://github.com/teamdigitale/daf-handbook) first.

## License

Copyright (c) 2019 Presidenza del Consiglio dei Ministri

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
