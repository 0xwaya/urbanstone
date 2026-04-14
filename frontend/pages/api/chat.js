import { getChatReply } from '../../lib/chatbot';
import { exec } from 'child_process';

const OLLAMA_MODEL_NAME = process.env.OLLAMA_MODEL_NAME || "llama3.1:8b";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Simple exec wrapper for calling Ollama chat CLI
function callOllamaChat(message) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const args = [
      'chat',
      OLLAMA_MODEL_NAME,
      '--base-url', OLLAMA_BASE_URL,
      '--no-stream',
      '--json'
    ];
    const options = {
      input: message,
      timeout: 15000,
      env: {
        ...process.env,
        OLLAMA_API_KEY: process.env.OLLAMA_API_KEY || '',
        // Add Authorization header for bearer token auth
        // Ollama CLI does not support direct header injection, this is a placeholder if needed
      }
    };

    const child = execFile('ollama', args, options, (error, stdout, stderr) => {
      if (error) return reject(error);
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed.responses?.[0] || "Sorry, no response.");
      } catch {
        resolve("Sorry, failed to parse response.");
      }
    });
  });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required.' });
    }

    try {
      const ollamaReply = await callOllamaChat(message);
      // fallback to knowledge base if Ollama fails or is empty
      if (!ollamaReply || ollamaReply.trim().length === 0) {
        const kbReply = getChatReply(message);
        return res.status(200).json({ reply: kbReply.reply, sources: kbReply.sources, contact: {
          phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840',
          email: process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co'
        }});
      }
      return res.status(200).json({ reply: ollamaReply, sources: [], contact: {
        phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840',
        email: process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co'
      }});
    } catch (error) {
      // default to knowledge base on error
      const kbReply = getChatReply(message);
      return res.status(200).json({ reply: kbReply.reply, sources: kbReply.sources, contact: {
        phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840',
        email: process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co'
      }});
    }
}
