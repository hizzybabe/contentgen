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
    const data = {
        prompt: document.getElementById('content-prompt').value || document.querySelector('[name="prompt"]').value,
        tone: document.getElementById('tone').value,
        style: document.getElementById('content_style').value,
        wordCount: document.getElementById('word-count').value || document.querySelector('[name="wordCount"]').value,
        language: document.getElementById('language').value,
        brandVoice: document.getElementById('brand-voice').value || document.querySelector('[name="brandVoice"]').value
    };

    // Show loading state
    const contentDiv = document.getElementById('generated-content');
    const statusMessages = document.getElementById('status-messages');
    
    statusMessages.classList.remove('hidden');
    contentDiv.innerHTML = '';
    addLog('Starting content generation...');

    fetch('/generate-content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Daily generation limit reached');
            } else if (response.status === 401) {
                window.location.href = '/login';
                throw new Error('Please log in to generate content');
            }
            return response.json().then(err => {
                throw new Error(err.error || 'Failed to generate content');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        addLog('Content generated successfully!');
        contentDiv.innerHTML = renderMarkdown(data.content);
        
        if (data.remaining_generations !== undefined) {
            document.getElementById('generations-count').textContent = 
                `${data.remaining_generations}/15`;
        }
        statusMessages.classList.add('hidden');
    })
    .catch(error => {
        addLog(`Error: ${error.message}`);
        contentDiv.innerHTML = `<div class="error">${error.message}</div>`;
        statusMessages.classList.add('hidden');
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
