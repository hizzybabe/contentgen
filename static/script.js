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

document.getElementById('contentForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const tone = document.getElementById('tone').value;
    const brandVoice = document.getElementById('brand_voice').value;
    const wordCount = document.getElementById('word_count').value;
    const mainPrompt = document.getElementById('main_prompt').value;
    const language = document.getElementById('language').value;
    const contentStyle = document.getElementById('content_style').value;

    const data = {
        tone: tone,
        brand_voice: brandVoice,
        word_count: wordCount,
        main_prompt: mainPrompt,
        language: language,
        content_style: contentStyle
    };

    fetch('/generate-content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 401) {
            // User is not authenticated
            window.location.href = '/login';
            throw new Error('Please log in to generate content');
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        document.getElementById('generated-content').innerHTML = data.content;
    })
    .catch(error => {
        document.getElementById('generated-content').innerHTML = `Error: ${error.message}`;
    });
});
