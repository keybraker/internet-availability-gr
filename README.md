# Internet Availability Crawler (Greece)

This program crawls [Cosmote's](https://www.cosmote.gr/selfcare/jsp/diathesimotita-adsl-vdsl-cosmotetv.jsp?ct=bus#) website to fetch data for internet speed in Greece. Data is first fetched for a city in Greece and when data is fetched, the crawler starts fetching internet speeds.

#### Instalation
   ```bash
   npm install
   ```
   
#### Run ```stateCrawler.js``` to fetch all counties of a state
   ```bash
   node areaCrawler.js 
   ```

#### Run ```countyCrawler.js``` to fetch all the addresses of a county
   ```bash
   node areaCrawler.js 
   ```
   
#### Run ```speedCrawler.js``` to fetch speeds of given country addresses
   ```bash
   node speedCrawler.js
   ```
   
#### Run ```dataAnalyzer.js``` to get a summary of the fetched data
   ```bash
   node dataAnalyzer.js
   ```
