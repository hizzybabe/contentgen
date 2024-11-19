function initTheme() {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        document.getElementById('moonIcon').classList.remove('hidden');
        document.getElementById('sunIcon').classList.add('hidden');
    }
}

// Initialize theme
initTheme();

// Add theme toggle functionality
document.getElementById('themeToggle').addEventListener('click', function() {
    const html = document.documentElement;
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');
    
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
        localStorage.setItem('theme', 'dark');
    }
});

function generateContent() {
    // Show loading indicator
    const statusMessages = document.getElementById('status-messages');
    const statusLog = document.getElementById('status-log');
    const generatedContent = document.getElementById('generated-content');
    
    statusMessages.classList.remove('hidden');
    generatedContent.innerHTML = '';
    
    // Log function
    function addLog(message) {
        const time = new Date().toLocaleTimeString();
        statusLog.innerHTML += `<div>[${time}] ${message}</div>`;
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    addLog('Starting content generation...');

    const data = {
        tone: document.getElementById('tone').value,
        brand_voice: document.getElementById('brand_voice').value,
        word_count: document.getElementById('word_count').value,
        main_prompt: document.getElementById('main_prompt').value,
        language: document.getElementById('language').value,
        content_style: document.getElementById('content_style').value
    };

    addLog('Sending request to AI model...');

    fetch('/generate-content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 401) {
            addLog('Authentication required');
            window.location.href = '/login';
            throw new Error('Please log in to generate content');
        }
        addLog('Response received, processing...');
        return response.json();
    })
    .then(data => {
        if (data.error) {
            addLog(`Error: ${data.error}`);
            throw new Error(data.error);
        }
        addLog('Content generated successfully!');
        generatedContent.innerHTML = data.content;
    })
    .catch(error => {
        addLog(`Error occurred: ${error.message}`);
        generatedContent.innerHTML = `Error: ${error.message}`;
    })
    .finally(() => {
        // Keep the status log visible but stop the spinner
        document.querySelector('.animate-spin').classList.remove('animate-spin');
    });
}
