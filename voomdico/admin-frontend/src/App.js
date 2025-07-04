import React, { useState, useEffect, useRef } from 'react';
import './index.css'; // Ensure Tailwind is imported

// Mock data for languages
const languages = [
  { code: 'moo', name: 'Mooré' },
  { code: 'diu', name: 'Dioula' },
  { code: 'ful', name: 'Fulfuldé' },
  // Add other languages as needed
];

function WordEntryForm({ onAddEntry }) {
  const [language, setLanguage] = useState(languages[0].code);
  const [frenchText, setFrenchText] = useState('');
  const [localTranslation, setLocalTranslation] = useState('');
  const [exampleUsage, setExampleUsage] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!frenchText || !localTranslation) {
      setStatusMessage('French text and local translation are required.');
      return;
    }
    setStatusMessage('Submitting...');
    const newEntry = {
      id: Date.now().toString(), // Simple unique ID
      language,
      frenchText,
      localTranslation,
      exampleUsage,
      audioFile: audioFile ? audioFile.name : (audioUrl ? 'recorded_audio.webm' : 'No audio'),
      audioUrl: audioUrl, // Store URL for playback if recorded
      createdAt: new Date().toISOString(),
    };
    console.log("New Entry Data:", newEntry);
    // Mock submission logic
    setTimeout(() => {
      onAddEntry(newEntry); // Pass to parent
      setStatusMessage(`Entry for "${frenchText}" submitted successfully! (Mocked)`);
      // Reset form
      setFrenchText('');
      setLocalTranslation('');
      setExampleUsage('');
      setAudioFile(null);
      setAudioUrl(''); // This will also trigger useEffect cleanup for the blob URL
      audioChunksRef.current = [];
    }, 1000);
  };

  const handleAudioRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      console.log("Recording stopped.");
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = []; // Clear previous chunks

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const newAudioUrl = URL.createObjectURL(audioBlob);
          // Revoke old URL if it exists and is a blob URL
          if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
          setAudioUrl(newAudioUrl);
          setAudioFile(new File([audioBlob], "recorded_audio.webm", { type: 'audio/webm' }));
          console.log("Recorded audio URL:", newAudioUrl);
           // Clean up the stream tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        // Revoke old URL if it exists from previous recording/upload
        if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl('');
        setAudioFile(null);
        console.log("Recording started...");
      } catch (err) {
        console.error("Error starting recording:", err);
        setStatusMessage("Error starting recording: " + err.message + ". Please ensure microphone permissions are granted.");
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Revoke old URL if it exists
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      if (isRecording) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          setIsRecording(false);
      }
    }
  };

  // Cleanup audio object URLs on component unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
        console.log("Cleaned up audio URL:", audioUrl);
      }
    };
  }, [audioUrl]); // Rerun when audioUrl changes to clean up the PREVIOUS one if necessary

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-white shadow-xl rounded-lg max-w-2xl mx-auto">
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="frenchText" className="block text-sm font-medium text-gray-700">French Text</label>
        <input
          type="text"
          id="frenchText"
          value={frenchText}
          onChange={(e) => setFrenchText(e.target.value)}
          required
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="localTranslation" className="block text-sm font-medium text-gray-700">Local Translation</label>
        <input
          type="text"
          id="localTranslation"
          value={localTranslation}
          onChange={(e) => setLocalTranslation(e.target.value)}
          required
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="exampleUsage" className="block text-sm font-medium text-gray-700">Example of Usage (Optional)</label>
        <textarea
          id="exampleUsage"
          value={exampleUsage}
          onChange={(e) => setExampleUsage(e.target.value)}
          rows={3}
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Audio</label>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={handleAudioRecord}
            className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <span className="text-sm text-gray-500">{isRecording ? "Recording..." : (audioFile ? "Audio selected/recorded" : "Or upload audio")}</span>
        </div>
        {!isRecording && (
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        )}
        {audioUrl && (
          <div className="mt-2">
            <audio controls src={audioUrl} className="w-full"></audio>
            <button
              type="button"
              onClick={() => {
                if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
                setAudioUrl('');
                setAudioFile(null);
              }}
              className="text-xs text-red-500 mt-1"
            >
              Clear Audio
            </button>
          </div>
        )}
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
        <p><strong>IA Validation (Placeholder):</strong></p>
        <ul className="list-disc list-inside ml-4">
          <li>Duplicate check: Pending...</li>
          <li>Spelling check: Pending...</li>
          <li>Grammar check: Pending...</li>
        </ul>
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        Add Entry
      </button>

      {statusMessage && <p className="mt-4 text-center text-sm text-gray-600">{statusMessage}</p>}
    </form>
  );
}

function AdminDashboard() {
  const [entries, setEntries] = useState(() => {
    try {
      const storedEntries = localStorage.getItem('voomdicoEntries');
      return storedEntries ? JSON.parse(storedEntries) : [];
    } catch (error) {
      console.error("Error loading entries from localStorage:", error);
      return [];
    }
  });

  const [stats, setStats] = useState({
    totalWords: 0,
    wordsToday: 0,
    topLanguage: 'N/A',
  });

  useEffect(() => {
    try {
      localStorage.setItem('voomdicoEntries', JSON.stringify(entries));
    } catch (error) {
      console.error("Error saving entries to localStorage:", error);
    }

    const today = new Date().toISOString().split('T')[0];
    const wordsTodayCount = entries.filter(entry => entry.createdAt && entry.createdAt.startsWith(today)).length;

    const langCounts = entries.reduce((acc, entry) => {
      acc[entry.language] = (acc[entry.language] || 0) + 1;
      return acc;
    }, {});

    let topLang = 'N/A';
    let maxCount = 0;
    for (const langCode in langCounts) {
      if (langCounts[langCode] > maxCount) {
        maxCount = langCounts[langCode];
        const langObj = languages.find(l => l.code === langCode);
        topLang = langObj ? langObj.name : langCode;
      }
    }

    setStats({
      totalWords: entries.length,
      wordsToday: wordsTodayCount,
      topLanguage: topLang,
    });
  }, [entries]);

  const handleAddEntry = (newEntry) => {
    setEntries(prevEntries => [newEntry, ...prevEntries]);
  };

  return (
    <div className="p-4">
      <div className="mb-8 p-6 bg-indigo-700 text-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold">VoomDico Admin Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Entries</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.totalWords}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Entries Today</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.wordsToday}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Most Enriched Language</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.topLanguage}</p>
        </div>
      </div>

      <WordEntryForm onAddEntry={handleAddEntry} />

      <div className="mt-12">
        <h3 className="text-2xl font-semibold mb-4 text-gray-800">Recent Entries (Latest 5)</h3>
        {entries.length === 0 ? (
          <p className="text-gray-600">No entries yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.slice(0, 5).map(entry => (
              <div key={entry.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h4 className="text-lg font-semibold text-indigo-600">{entry.frenchText} / {entry.localTranslation}</h4>
                <p className="text-sm text-gray-500">Language: {languages.find(l=>l.code === entry.language)?.name || entry.language}</p>
                {entry.exampleUsage && <p className="text-sm text-gray-700 mt-1">Example: {entry.exampleUsage}</p>}
                {entry.audioUrl && entry.audioUrl.startsWith('blob:') &&
                  <audio controls src={entry.audioUrl} className="mt-2 w-full max-w-xs">Your browser does not support the audio element.</audio>
                }
                <p className="text-xs text-gray-400 mt-1">Added: {new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <AdminDashboard />
    </div>
  );
}

export default App;
