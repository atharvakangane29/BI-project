import React, { useState, useEffect } from 'react';
import { PowerBIEmbed } from 'powerbi-client-react';
import { models } from 'powerbi-client';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function DashboardChat() {
  const [embedConfig, setEmbedConfig] = useState(null);
  const [reportObj, setReportObj] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await axios.get(`${BACKEND_URL}/get-embed-token`);
        setEmbedConfig({
          type: 'report',
          id: response.data.reportId,
          embedUrl: response.data.embedUrl,
          accessToken: response.data.embedToken,
          tokenType: models.TokenType.Embed,
          settings: {
            panes: { filters: { expanded: false, visible: false } },
            navContentPaneEnabled: false,
          }
        });
      } catch (error) {
        console.error("Error fetching embed token:", error);
      }
    }
    fetchConfig();
  }, []);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!reportObj || !chatInput.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/chat-to-filter`, {
        message: chatInput
      });
      
      const newFilters = response.data.filters;
      await reportObj.setFilters(newFilters);
      setChatInput("");
    } catch (error) {
      console.error("Failed to apply filters:", error);
      alert("Could not process the filter request.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!embedConfig) return <div style={{ padding: '20px' }}>Loading dashboard configuration...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Power BI Embed Section */}
      <div style={{ flex: 3, backgroundColor: '#f3f2f1' }}>
        <PowerBIEmbed
          embedConfig={embedConfig}
          cssClassName="powerbi-frame"
          getEmbeddedComponent={(embeddedReport) => {
            setReportObj(embeddedReport);
          }}
        />
      </div>

      {/* Chat Interface Section */}
      <div style={{ flex: 1, padding: '20px', borderLeft: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 20px 0' }}>Data Copilot</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', padding: '10px', backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '4px' }}>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Ask a question to filter the dashboard. Try: <em>"Show me the West region"</em>
            </p>
        </div>

        <form onSubmit={handleChatSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <input 
            type="text" 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            placeholder="Type your filter request..."
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '10px' }}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ padding: '12px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '4px', cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
             {isLoading ? 'Applying...' : 'Filter Dashboard'}
          </button>
        </form>
      </div>

    </div>
  );
}

export default DashboardChat;