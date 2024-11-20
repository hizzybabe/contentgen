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
    // Get form values
    const data = {
        prompt: document.querySelector('textarea[name="main_prompt"]').value,
        tone: document.querySelector('select[name="tone"]').value,
        style: document.querySelector('select[name="content_style"]').value,
        wordCount: document.querySelector('input[name="word_count"]').value,
        language: document.querySelector('select[name="language"]').value,
        brandVoice: document.querySelector('textarea[name="brand_voice"]').value
    };

    // Validate required fields
    if (!data.prompt) {
        addLog('Error: Main prompt is required');
        return;
    }

    // Show loading state
    const contentDiv = document.getElementById('generated-content');
    const statusMessages = document.getElementById('status-messages');
    const generateButton = document.querySelector('button[onclick="generateContent()"]');
    
    if (!contentDiv || !statusMessages || !generateButton) {
        console.error('Required DOM elements not found');
        return;
    }
    
    statusMessages.classList.remove('hidden');
    contentDiv.innerHTML = '';
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
    
    addLog('Starting content generation...');
    addLog(`Prompt: "${data.prompt.substring(0, 50)}..."`);
    addLog(`Style: ${data.style}, Tone: ${data.tone}`);

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
                addLog('Error: Authentication required');
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
        
        if (!data.content) {
            throw new Error('No content received from server');
        }

        addLog('Content generated successfully!');
        
        // Create a wrapper div for the content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'relative bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm';
        contentWrapper.innerHTML = renderMarkdown(data.content);
        
        // Clear previous content and append new content
        contentDiv.innerHTML = '';
        contentDiv.appendChild(contentWrapper);
        
        // Add copy button
        const copyButton = addCopyButton(contentWrapper);
        contentWrapper.appendChild(copyButton);
        
        if (data.remaining_generations !== undefined) {
            const generationsCount = document.getElementById('generations-count');
            if (generationsCount) {
                generationsCount.textContent = `${data.remaining_generations}/15`;
            }
            addLog(`Remaining generations today: ${data.remaining_generations}/15`);
        }
    })
    .catch(error => {
        addLog(`Error: ${error.message}`);
        contentDiv.innerHTML = `<div class="error p-4 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 rounded-lg">${error.message}</div>`;
    })
    .finally(() => {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Content';
    });
}

function renderMarkdown(content) {
    if (!content) return '';
    
    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: true
    });
    
    try {
        return marked.parse(content);
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return content; // Return raw content if parsing fails
    }
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

function addLog(message) {
    const logDiv = document.getElementById('status-log');
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    logDiv.innerHTML += formattedMessage + '\n';
    logDiv.scrollTop = logDiv.scrollHeight;
    console.log(formattedMessage); // Also log to console for debugging
}
