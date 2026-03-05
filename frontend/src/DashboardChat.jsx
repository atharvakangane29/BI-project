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
    // 1. Paste the values you got from the Power BI website here:
    const myReportId = "PASTE_REPORT_ID_HERE";
    const myEmbedUrl = "https://app.powerbi.com/reportEmbed?reportId=PASTE_REPORT_ID_HERE"; 
    const myAadToken = "PASTE_COPIED_TOKEN_HERE";

    // 2. Set the config directly, skipping the backend axios.get call
    setEmbedConfig({
      type: 'report',
      id: "2344aa65-8129-4fb4-ba09-66ebcb2823dc",
      embedUrl: "https://app.powerbi.com/reportEmbed?reportId=2344aa65-8129-4fb4-ba09-66ebcb2823dc&config=eyJjbHVzdGVyVXJsIjoiaHR0cHM6Ly9XQUJJLUlORElBLUNFTlRSQUwtQS1QUklNQVJZLXJlZGlyZWN0LmFuYWx5c2lzLndpbmRvd3MubmV0IiwiZW1iZWRGZWF0dXJlcyI6eyJ1c2FnZU1ldHJpY3NWTmV4dCI6dHJ1ZX19",
      accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InNNMV95QXhWOEdWNHlOLUI2ajJ4em1pazVBbyIsImtpZCI6InNNMV95QXhWOEdWNHlOLUI2ajJ4em1pazVBbyJ9.eyJhdWQiOiJodHRwczovL2FuYWx5c2lzLndpbmRvd3MubmV0L3Bvd2VyYmkvYXBpIiwiaXNzIjoiaHR0cHM6Ly9zdHMud2luZG93cy5uZXQvOTA5MDQxODctYTg3Yy00NmEwLThhNjAtMThjM2JlNzE5MTVkLyIsImlhdCI6MTc3MjQ3NTU1OCwibmJmIjoxNzcyNDc1NTU4LCJleHAiOjE3NzI0ODEyNTMsImFjY3QiOjAsImFjciI6IjEiLCJhaW8iOiJBWFFBaS84YkFBQUFGcG5VODVhYm5sZ0FxNjdUWlFqR1ZZZWVZNUl6Mnp2S21Gb2pCSEFzZThWVkJ1RnFOdk1lR0pkU01vUzMyK28yWmMyZ041Yk9TcExCa3pPTXV0cXBESzl6WEdkbm41WU1zcXBtckJUY3hyVk01eGJOemhxaE5heEd4NXJOU1pzSFFGenRZZzBuQ0dLb1hDS3d4RmtyTWc9PSIsImFtciI6WyJwd2QiLCJtZmEiXSwiYXBwaWQiOiI4NzFjMDEwZi01ZTYxLTRmYjEtODNhYy05ODYxMGE3ZTkxMTAiLCJhcHBpZGFjciI6IjAiLCJmYW1pbHlfbmFtZSI6IkthbmdhbmUiLCJnaXZlbl9uYW1lIjoiQXRoYXJ2YSIsImlkdHlwIjoidXNlciIsImlwYWRkciI6IjEyMi4xNjcuMTE0LjExOCIsIm5hbWUiOiJBdGhhcnZhIEpheWFudCBLYW5nYW5lIiwib2lkIjoiZDNjYzViNTItZjhiNy00MThmLThmN2EtNmNjZTY3OGQ3NmZjIiwicHVpZCI6IjEwMDMyMDA1NUFFMDQzQTMiLCJyaCI6IjEuQVQ0QWgwR1FrSHlvb0VhS1lCakR2bkdSWFFrQUFBQUFBQUFBd0FBQUFBQUFBQUFBQU9zLUFBLiIsInNjcCI6InVzZXJfaW1wZXJzb25hdGlvbiIsInNpZCI6IjAwMmUxY2NhLTY5ODAtNDcxOS02M2FjLTlmYjU2NmRlOTNkZiIsInN1YiI6IlJ6bm1QUVFpUnR0N1lsSzNVRDVhWkc0akR3WVg0TWp3Q0o3UDkzbUdDUlUiLCJ0aWQiOiI5MDkwNDE4Ny1hODdjLTQ2YTAtOGE2MC0xOGMzYmU3MTkxNWQiLCJ1bmlxdWVfbmFtZSI6IkF0aGFydmFLQGNpcmN1bGFudHMuY29tIiwidXBuIjoiQXRoYXJ2YUtAY2lyY3VsYW50cy5jb20iLCJ1dGkiOiJtY2VPUXkyWF9reXRyaXlWQXJkb0FBIiwidmVyIjoiMS4wIiwid2lkcyI6WyJiNzlmYmY0ZC0zZWY5LTQ2ODktODE0My03NmIxOTRlODU1MDkiXSwieG1zX2FjdF9mY3QiOiIzIDUiLCJ4bXNfZnRkIjoibjhMTk9LMTBNRUd0Y3FzMjB3UGx4ak15S3ZZV0hFYzRUWmR0NXVkaEt0Y0JhbUZ3WVc1bFlYTjBMV1J6YlhNIiwieG1zX2lkcmVsIjoiMSAxMiIsInhtc19zdWJfZmN0IjoiMyA4In0.VZTh-xxfZb-US0PoFvahavEIoGyravewoD4L3r1tpa0ljAnrDktMHLseIw_dUuBRn4V1qjppCn5zUbMhgXy2MMdleBAu7D-9gmGGvAcLjfiEvkSzOfAyTK-VNZpfnqWQEO9JRmkixFhInWgr0X1AWpaI-gB9sS9wrxmNBApQTlb6XmRYMyr4Hnssf58JBwxU2e-xTekVx1ufstUKXC0QMxWiNj5-T4aN1Q0sikduvV9Ohsddzx2_5xo9tOIvIgR6Cwec-JoKqQ0nh69xz8Q8yDvayOhQlxBbKxt-k5CxW3_5k9o8nQZVaXT1_-h_TvhGGEdGHxcyHl5IDtZMWwfHrw",
      pageName: "c6399044ab3e2550fc73",
      tokenType: models.TokenType.Aad, // IMPORTANT: This must be Aad, not Embed
      settings: {
        panes: { filters: { expanded: false, visible: false } },
        navContentPaneEnabled: false,
      }
    });
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
      
      // 1. Get the current active page
      const pages = await reportObj.getPages();
      const activePage = pages.find(p => p.isActive);
      
      // 2. Get all visuals on that page
      const visuals = await activePage.getVisuals();
      
      // 3. Find only the visuals that are "slicers" (sliders/dropdowns)
      const slicers = visuals.filter(v => v.type === 'slicer');
      
      if (slicers.length > 0) {
        // 4. Inject the AI's filter directly into the physical Slicer state
        for (let slicer of slicers) {
          try {
            await slicer.setSlicerState({ filters: newFilters });
          } catch (err) {
            console.log("Could not update a specific slicer", err);
          }
        }
      } else {
        // Fallback: If no physical slicer is on the screen, apply as a background filter
        await reportObj.setFilters(newFilters);
      }
      
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