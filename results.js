document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('concertForm');
    const resultsDiv = document.getElementById('results');
    const downloadButton = document.getElementById('downloadButton');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();  // Prevent the default form submission

        const name = document.getElementById('name').value; // Capture username
        const artist = document.getElementById('artist').value;
        const location = document.getElementById('country').value; // Get selected country code

        try {
            const response = await fetch('/submit', {  // Change to '/submit'
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ artist, location, name })  // Include username
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const html = await response.text();  // Get the HTML response
            resultsDiv.innerHTML = html;  // Update results div with the rendered HTML

            // Show the download button if there are results
            downloadButton.style.display = 'block'; // Make it visible

        } catch (error) {
            resultsDiv.innerHTML = '<p>Error fetching concert data. Please try again later.</p>';
            console.error('Error:', error);
            downloadButton.style.display = 'none'; // Hide download button on error
        }
    });
});
