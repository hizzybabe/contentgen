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
    const statusMessages = document.getElementById('status-messages');
    const statusLog = document.getElementById('status-log');
    const generatedContent = document.getElementById('generated-content');
    
    statusMessages.classList.remove('hidden');
    generatedContent.innerHTML = '';
    
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

    fetch('/generate-content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 429) {
            addLog('Daily generation limit reached');
            throw new Error('Daily generation limit reached (15/day). Please try again tomorrow.');
        }
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
        addLog(`Remaining generations today: ${data.remaining_generations}/15`);
        
        const contentDiv = document.getElementById('generated-content');
        contentDiv.className = 'mt-6 generated-content relative p-6 bg-gray-50 dark:bg-gray-800 rounded-lg';
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'markdown-content';
        contentWrapper.innerHTML = renderMarkdown(data.content);
        
        contentDiv.innerHTML = '';
        contentDiv.appendChild(contentWrapper);
    })
    .catch(error => {
        addLog(`Error occurred: ${error.message}`);
        generatedContent.innerHTML = `<div class="error">${error.message}</div>`;
    });
}

function renderMarkdown(content) {
    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true
    });
    
    // Convert markdown to HTML
    return marked.parse(content);
}

function addCopyButton(element) {
    const copyButton = document.createElement('button');
    copyButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M8 5a2 2 0 002 2h4a2 2 0 002-2M8 5a2 2 0 012-2h4a2 2 0 012 2"/>
        </svg>
        Copy
    `;
    copyButton.className = 'copy-button absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600';
    
    copyButton.onclick = async () => {
        const content = element.innerText;
        await navigator.clipboard.writeText(content);
        
        copyButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Copied!
        `;
        setTimeout(() => {
            copyButton.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M8 5a2 2 0 002 2h4a2 2 0 002-2M8 5a2 2 0 012-2h4a2 2 0 012 2"/>
                </svg>
                Copy
            `;
        }, 2000);
    };
    
    return copyButton;
}
