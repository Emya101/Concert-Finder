const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const app = express();
const Port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure Nunjucks
nunjucks.configure('views', {
    autoescape: true,
    express: app,
    noCache: true
});

// Your Ticketmaster API key
const ticketmasterApiKey = 'fNGs463yHXn5tkx8OAFlA2mrGsQeBViz';

// Function to fetch concert data from Ticketmaster
async function fetchConcertData(artist, location) {
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/events.json`;

    try {
        const response = await axios.get(apiUrl, {
            params: {
                apikey: ticketmasterApiKey,
                keyword: artist,
                countryCode: location
            }
        });

        console.log('API Response:', response.data); // Log the API response

        if (response.data._embedded && response.data._embedded.events.length > 0) {
            return response.data._embedded.events
                .filter(event => event.classifications && event.classifications.some(c => c.segment && c.segment.name === "Music"))
                .map(event => {
                    const venue = event._embedded.venues[0];
                    return {
                        name: event.name,
                        date: event.dates.start.localDate,
                        venue: venue.name,
                        ticketUrl: event.url
                    };
                });
        } else {
            console.log(`No concerts found for ${artist} in ${location}`);
            return []; // Return empty array if no concerts found
        }
    } catch (error) {
        console.error('Error fetching concert data:', error);
        throw error;
    }
}


async function renderConcerts(res, name, artist, location, concerts) {
    if (concerts.length > 0) {
        // Render results using Nunjucks template
        res.render('concerts.njk', { name, artist, location, concerts });
        
        const concertDetails = concerts.map(concert => 
            `- ${concert.name} at ${concert.venue} on ${concert.date}\n  More info: ${concert.ticketUrl}`
        ).join('\n\n');

        const filePath = path.join(__dirname, 'concert_results.txt');

        // Write the concert details to the file
        try {
            console.log(`Writing concert results to ${filePath}`);
            fs.writeFileSync(filePath, `Concerts for ${artist} in ${location}:\n\n${concertDetails}`);
            console.log(`Concert results written to ${filePath}`); // Log success
        } catch (err) {
            console.error('Error writing to file:', err); // Log the error
            res.status(500).send('Error writing to file');
            return; // Exit early if there's an error
        }
    } else {
        res.render('noConcerts.njk', { artist, location });
    }
}

// Serve the form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'concertForm.html'));
});

// Handle form submission and display concerts
app.post('/submit', async (req, res) => {
    const { name, artist, location } = req.body;
    try {
        const concerts = await fetchConcertData(artist, location);
        await renderConcerts(res, name, artist, location, concerts);
    } catch (error) {
        console.error('Error during concert search:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/download', (req, res) => {
    const filePath = path.join(__dirname, 'concert_results.txt');
    
    // Check if the file exists before attempting to download
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'concert_results.txt', (err) => {
            if (err) {
                console.error('Error downloading the file:', err);
                res.status(500).send('Error downloading the file');
            }
        });
    } else {
        console.error('File not found:', filePath);
        res.status(404).send('File not found');
    }
});


// Handle AJAX form submission and return concert data as JSON
app.post('/api/concerts', async (req, res) => {
    const { artist, location,name } = req.body;

    try {
        const concerts = await fetchConcertData(artist, location);
        // Render the concert results using Nunjucks, including username
        const html = nunjucks.render('concerts.njk', { name,artist, location, concerts });

        // Return the rendered HTML
        res.send(html);
    } catch (error) {
        console.error('Error fetching concert data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Custom 404 handler
app.use((req, res) => {
    res.status(404).send('404: Page Not Found');
});

// Custom 500 handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('500: Internal Server Error');
});

// Start the server
app.listen(Port, () => {
    console.log(`Server is running on http://localhost:${Port}`);
});
