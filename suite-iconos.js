/* Íconos propios de Mi Suite (SVG de trazo, 24x24). Uso: ic('edit') o ic('edit', 18). Heredan el color del texto. */
(function(){
  var P = {
    'calc':'<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    'wallet':'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a1 1 0 0 1 1 1v2"/><path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H19a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 5.5"/><path d="M16 13.5h.01"/>',
    'dots':'<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
    'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    'moon':'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    'auto':'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
    'gear':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    'chev-left':'<path d="M15 5l-7 7 7 7"/>',
    'chev-right':'<path d="M9 5l7 7-7 7"/>',
    'chev-down':'<path d="M5 9l7 7 7-7"/>',
    'chev-up':'<path d="M5 15l7-7 7 7"/>',
    'sliders':'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    'x':'<path d="M6 6l12 12M18 6L6 18"/>',
    'edit':'<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/>',
    'trash':'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    'swap':'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    'scale':'<path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8zM19 8l-2.5 6a3 3 0 0 0 5 0L19 8z"/>',
    'download':'<path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14"/>',
    'upload':'<path d="M12 16V5M7.5 9L12 4.5 16.5 9M5 20h14"/>',
    'refresh':'<path d="M20 11a8 8 0 0 0-14.3-4.2L4 9M4 4v5h5M4 13a8 8 0 0 0 14.3 4.2L20 15M20 20v-5h-5"/>',
    'phone':'<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    'check':'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'help':'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01"/>',
    'shield':'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    'cloud-off':'<path d="M3 3l18 18M17.5 17.5H7a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 9 5.6M19 13.2A3.5 3.5 0 0 1 17.5 17.5"/>',
    'inbox':'<path d="M4 13l2.5-7.5A2 2 0 0 1 8.4 4h7.2a2 2 0 0 1 1.9 1.5L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5z"/><path d="M4 13h4.5a1.5 1.5 0 0 1 1.5 1.5 2 2 0 0 0 4 0 1.5 1.5 0 0 1 1.5-1.5H20"/>',
    'plus':'<path d="M12 5v14M5 12h14"/>',
    'cloud':'<path d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17.5 18H7z"/>',
    'cloud-ok':'<path d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17.5 18H7z"/><path d="M9.5 13l2 2 3.5-3.5"/>',
    'pie':'<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15.5 3.7A9 9 0 0 1 20.3 8.5H15.5z"/>',
    'calendar':'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    'briefcase':'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18M11 13h2"/>',
    'coins':'<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    'receipt':'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    'bank':'<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    'cash':'<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 12h.01M17.5 12h.01"/>',
    'card':'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
    'send':'<path d="M21 3L10 14M21 3l-7 18-4-8-8-4 19-6z"/>'
  };
  window.ICONOS = P;
  window.ic = function(name, size){
    var d = P[name]; if(!d) return '';
    var s = size || 20;
    return '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="'+s+'" height="'+s+'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>';
  };
})();
