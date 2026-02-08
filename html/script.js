console.log("HUD JS Başlatıldı - Final Version v10 (Pause Animation Fix)"); 

const resourceName = window.GetParentResourceName ? window.GetParentResourceName() : "restlib-hud";
const HUD_POSITIONS_KEY = "restlib_hud_positions_v1";
const HUD_PREFS_KEY = "restlib_hud_main_prefs_v1"; 
const HUD_STYLE_KEY = "restlib_hud_style_v1";
const HUD_INFO_STYLE_KEY = "restlib_hud_info_style_v1"; 
const HUD_OPACITY_KEY = "restlib_hud_opacity_v1";

function injectStyles() {
    const css = `
        body { transition: opacity 0.4s ease-in-out !important; }
        body.hud-paused { opacity: 0 !important; pointer-events: none !important; }
    `;
    const head = document.head || document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    head.appendChild(style);
}
injectStyles(); 

const pixelsPerDegree = 3.55;

const healthCount = 10; 
let isInVehicle = false; 
let isPaused = false; 

const hudToggles = {
    'toggle-compass-info': ['top-area-compass'], 
    'toggle-server':       ['area-server'],      
    'toggle-location':     ['area-location', 'top-area-location'], 
    'toggle-char':         ['area-char', 'top-area-player'],
    'toggle-job':          ['area-job'],         
    'toggle-money':        ['area-cash', 'area-bank', 'top-area-money'],
    'toggle-time':         ['area-time', 'top-area-time'],
    'toggle-veh-name':     ['vehicle-name-label'] 
};
function updateHudOpacity(val) {
    const topBar = document.getElementById('top-info-bar');
    if(topBar) {
        topBar.style.backgroundColor = `rgba(15, 15, 20, ${val})`; 
        topBar.style.borderColor = `rgba(255, 255, 255, ${val * 0.1})`; 
        topBar.style.boxShadow = `0 5px 20px rgba(0, 0, 0, ${val * 0.5})`; 
        
        const shadowOpacity = (1 - val) * 0.8;
        topBar.style.textShadow = `1px 1px 2px rgba(0, 0, 0, ${shadowOpacity})`;
    }

    const rightElements = document.querySelectorAll('.info-box:not(#ammo-hud), .gear-box, .alerts-box, .speed-cluster-bg, .server-title');
    
    rightElements.forEach(el => {
        el.style.backgroundColor = `rgba(0, 0, 0, ${val})`; 
        el.style.borderColor = `rgba(255, 255, 255, ${val * 0.15})`; 
        el.style.boxShadow = `0 4px 8px rgba(0, 0, 0, ${val * 0.7})`; 

        const shadowIntensity = (1 - val) * 0.9;
        el.style.textShadow = `1px 1px 3px rgba(0, 0, 0, ${shadowIntensity})`;
    });

    localStorage.setItem(HUD_OPACITY_KEY, val);
}

function applySafeZoneLogic() {
    if (document.body.classList.contains('edit-mode-active')) return;
    
    const resetTargets = '#drag-status, #drag-status-bar-rounded, .style-modern-container, #drag-health, #drag-armor';

    if (isInVehicle) {
        document.body.classList.add('vehicle-mode');
        $(resetTargets).css({ 
            'left': '', 
            'top': '', 
            'bottom': '', 
            'right': '' 
        });
    } else {
        document.body.classList.remove('vehicle-mode');
        const savedPosRaw = localStorage.getItem(HUD_POSITIONS_KEY);
        if (savedPosRaw) {
             const positions = JSON.parse(savedPosRaw);
             for (const [id, pos] of Object.entries(positions)) {
                 $(`#${id}`).css({ left: pos.left + "%", top: pos.top + "%", bottom: "auto", right: "auto" });
             }
        } else {
            $('.draggable-element').css({ 'left': '', 'top': '', 'bottom': '', 'right': '' });
        }
    }
}

function checkMasterVisibility() {
    const masterToggle = document.getElementById('toggle-master-info');
    const isMasterOn = masterToggle ? masterToggle.checked : true;
    
    const compassToggle = document.getElementById('toggle-compass-info');
    const isCompassOn = compassToggle ? compassToggle.checked : true;

    const topBar = document.getElementById('top-info-bar');
    const rightBar = document.getElementById('drag-info');
    const compassArea = document.getElementById('drag-compass');
    const savedInfoStyle = localStorage.getItem(HUD_INFO_STYLE_KEY) || 'right';

    if (!isMasterOn || isPaused) {
        if (topBar) topBar.style.display = 'none';
        if (rightBar) rightBar.style.display = 'none';
        if (compassArea) compassArea.style.display = 'none';
        return; 
    }

    if (savedInfoStyle === 'top') {
        if (rightBar) rightBar.style.display = 'none'; 
        if (topBar) {
            topBar.style.display = 'flex';
            updateSeparators(); 
        }
        document.body.classList.add('compass-force-hidden'); 
        if (compassArea) compassArea.style.display = 'none';
    } else {
        if (topBar) topBar.style.display = 'none'; 
        if (rightBar) rightBar.style.display = 'block'; 
        document.body.classList.remove('compass-force-hidden');
        
        if (compassArea) {
            compassArea.style.display = isCompassOn ? 'block' : 'none';
        }
    }
}

function updateSeparators() {
    const topBar = document.getElementById('top-info-bar');
    if (!topBar) return;
    topBar.style.display = 'flex';
    const seps = topBar.querySelectorAll('.top-sep');
    seps.forEach(s => s.style.display = 'none');
    const allItems = Array.from(topBar.querySelectorAll('.top-item'));
    const visibleItems = allItems.filter(el => el.style.display !== 'none');
    if (visibleItems.length === 0) { topBar.style.display = 'none'; } 
    else {
        for (let i = 0; i < visibleItems.length - 1; i++) {
            let currentItem = visibleItems[i];
            let nextEl = currentItem.nextElementSibling;
            while (nextEl) {
                if (nextEl.classList.contains('top-sep')) { nextEl.style.display = 'block'; break; }
                if (nextEl.classList.contains('top-item')) break; 
                nextEl = nextEl.nextElementSibling;
            }
        }
    }
}

function updateHudStyle(styleName) {
    let currentStyle = styleName;
    if (styleName === true || styleName === 'true') currentStyle = 'round';
    if (styleName === false || styleName === 'false') currentStyle = 'rect';

    document.body.classList.remove('style-rect', 'style-rounded', 'style-modern');
    document.body.classList.add('style-' + currentStyle);

    $('.style-rect-container, #drag-status-bar-rounded, .style-modern-container').hide();
    const rectArmorEl = document.getElementById('drag-armor');
    if(rectArmorEl) rectArmorEl.style.setProperty('display', 'none', 'important');

    let targetHud;
    if (currentStyle === 'round') { 
        targetHud = $('#drag-status-bar-rounded');
    } else if (currentStyle === 'rect') { 
        targetHud = $('.style-rect-container');
        const rectArmor = document.getElementById('drag-armor');
        if(rectArmor) rectArmor.style.setProperty('display', 'flex', 'important');
    } else if (currentStyle === 'modern') {
        targetHud = $('.style-modern-container');
    }

    if (targetHud) {
        targetHud.fadeIn(300).css('display', 'flex');
        
        if (!document.body.classList.contains('edit-mode-active')) {
            const savedPos = localStorage.getItem(HUD_POSITIONS_KEY);
            if (!savedPos || savedPos === "{}" || savedPos === "null") {
                targetHud.css({
                    'left': '1.5vw',
                    'bottom': '3vh',
                    'top': 'auto',
                    'right': 'auto',
                    'transform': 'none'
                });
            }
        }
    }

    localStorage.setItem(HUD_STYLE_KEY, currentStyle);
    setTimeout(applySafeZoneLogic, 50);
}

function updateInfoStyle(style) {
    const infoSelector = document.getElementById('info-style-selector');
    if(infoSelector) infoSelector.value = style;
    localStorage.setItem(HUD_INFO_STYLE_KEY, style);
    checkMasterVisibility();
}

function loadHudPreferences() {
    const savedPrefs = JSON.parse(localStorage.getItem(HUD_PREFS_KEY) || "{}");
    const masterToggle = document.getElementById('toggle-master-info');
    let isMasterOn = true;
    if (savedPrefs['masterInfo'] !== undefined) isMasterOn = savedPrefs['masterInfo'];
    
    if (masterToggle) {
        masterToggle.checked = isMasterOn;
        masterToggle.addEventListener('change', function() {
            let currentPrefs = JSON.parse(localStorage.getItem(HUD_PREFS_KEY) || "{}");
            currentPrefs['masterInfo'] = this.checked;
            localStorage.setItem(HUD_PREFS_KEY, JSON.stringify(currentPrefs));
            checkMasterVisibility();
        });
    }

    for (const [toggleId, targetIds] of Object.entries(hudToggles)) {
        const toggleEl = document.getElementById(toggleId);
        let isVisible = true;
        if (savedPrefs[toggleId] !== undefined) isVisible = savedPrefs[toggleId];
        if (toggleEl) toggleEl.checked = isVisible;
        targetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = isVisible ? 'flex' : 'none';
        });
    }
    
    if (savedPrefs.showCompass !== undefined) {
        let compassToggle = document.getElementById('compass-toggle');
        let state = savedPrefs.showCompass;
        if (compassToggle) compassToggle.checked = state;
        if (!state) document.body.classList.add('compass-hidden');
        else document.body.classList.remove('compass-hidden');
        fetch(`https://${resourceName}/toggleCompass`, { method: 'POST', body: JSON.stringify({ state: state }) });
    }

    const saved = localStorage.getItem(HUD_POSITIONS_KEY);
    if (saved && saved !== "{}" && saved !== "null") {
        const positions = JSON.parse(saved);
        for (const [id, pos] of Object.entries(positions)) {
            $(`#${id}`).css({ left: pos.left + "%", top: pos.top + "%", bottom: "auto", right: "auto", transform: 'none' });
        }
    }
    updateAlignments();

    const savedStyle = localStorage.getItem(HUD_STYLE_KEY);
    if (savedStyle !== null) updateHudStyle(savedStyle);
    else updateHudStyle('rect'); 

    const savedInfoStyle = localStorage.getItem(HUD_INFO_STYLE_KEY) || 'right';
    const infoSelector = document.getElementById('info-style-selector');
    if(infoSelector) infoSelector.value = savedInfoStyle;

    const savedOpacity = localStorage.getItem(HUD_OPACITY_KEY) || "0.8";
    const opacitySlider = document.getElementById('bg-opacity-slider');
    if(opacitySlider) {
        opacitySlider.value = savedOpacity;
        updateHudOpacity(savedOpacity);
        opacitySlider.addEventListener('input', function() {
            updateHudOpacity(this.value);
        });
    }

    setTimeout(checkMasterVisibility, 100);
}

function setupDetailListeners() {
    for (const [toggleId, targetIds] of Object.entries(hudToggles)) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('change', function() {
                const isChecked = this.checked;
                targetIds.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.style.display = isChecked ? 'flex' : 'none';
                });
                let savedPrefs = JSON.parse(localStorage.getItem(HUD_PREFS_KEY) || "{}");
                savedPrefs[toggleId] = isChecked;
                localStorage.setItem(HUD_PREFS_KEY, JSON.stringify(savedPrefs));
                checkMasterVisibility();
            });
        }
    }
    const styleSelector = document.getElementById('style-selector');
    if (styleSelector) {
        styleSelector.addEventListener('change', function() { updateHudStyle(this.value); });
    }
    const infoSelector = document.getElementById('info-style-selector');
    if (infoSelector) {
        infoSelector.addEventListener('change', function() { updateInfoStyle(this.value); });
    }
}

function createCompassHud() {
    const compassStrip = document.getElementById('compass-strip');
    if(!compassStrip) return;
    compassStrip.innerHTML = '';
    
    for (let i = 0; i < 2; i++) {
        for (let deg = 0; deg < 360; deg += 15) {
            let el = document.createElement('div');
            let label = "";
            
            if (deg === 0) label = "N"; 
            else if (deg === 45) label = "NE"; 
            else if (deg === 90) label = "E"; 
            else if (deg === 135) label = "SE"; 
            else if (deg === 180) label = "S"; 
            else if (deg === 225) label = "SW"; 
            else if (deg === 270) label = "W"; 
            else if (deg === 315) label = "NW";
            
            if (label !== "") { 
                el.className = "dir"; 
                el.innerText = label; 
            } else { 
                el.className = "tick"; 
                el.innerText = "|"; 
            }
            compassStrip.appendChild(el);
        }
    }
}

function formatMoney(amount) { 
    let value = parseFloat(amount); 
    if (isNaN(value)) value = 0; 
    return new Intl.NumberFormat('tr-TR').format(Math.floor(value)); 
}
function createSegments(id, count, cls) { 
    let c = document.getElementById(id); 
    if (!c) return; 
    c.innerHTML = ''; 
    for(let i=0; i<count; i++){ let d = document.createElement('div'); d.classList.add(cls); c.appendChild(d); } 
}
function updateBar(id, val, max) { 
    let container = document.getElementById(id); 
    if (!container) return; 
    let children = container.children; 
    let active; 
    if (val >= 100) active = max; else if (val <= 0) active = 0; else { active = Math.floor((val/100)*max); if (val > 0 && active === 0) active = 1; } 
    for(let i=0; i<max; i++) { 
        if (children[i]) { 
            if (i < active) children[i].classList.add('active'); else children[i].classList.remove('active'); 
        } 
    } 
}
function updateAlignments() {
    $('.draggable-element').each(function() {
        const el = $(this);
        const container = el.find('.info-hud');
        
        if (container.length > 0) {
            const isRightSide = el.offset().left > (window.innerWidth / 2);
            
            if (isRightSide) {
                container.css('align-items', 'flex-end');
                container.find('.info-group').css('flex-direction', 'row-reverse');
            } else {
                container.css('align-items', 'flex-start');
                container.find('.info-group').css('flex-direction', 'row');
            }
        }
    });
}

$(function() {
    createSegments('health-segments', healthCount, 'health-seg');
    createSegments('armor-segments', 10, 'armor-seg');
    createCompassHud(); 
    const rpmContainer = document.getElementById('rpm-bar-container');
    if(rpmContainer) {
        rpmContainer.innerHTML = '';
        for(let i=0; i<15; i++) { let b = document.createElement('div'); b.className = 'rpm-bar'; rpmContainer.appendChild(b); }
    }
    const serverTitle = document.querySelector('.server-title');
    if (serverTitle && !serverTitle.querySelector('img')) {
        const img = document.createElement('img');
        img.src = 'img/logo.png'; 
        img.style.height = '24px'; img.style.width = 'auto'; img.style.marginRight = '10px';
        img.onerror = function() { this.style.display='none'; };
        serverTitle.style.display = 'flex'; serverTitle.style.alignItems = 'center';
        serverTitle.prepend(img); 
    }
    loadHudPreferences();
    setupDetailListeners();
    $(".draggable-element").draggable({ containment: "window", scroll: false, stop: function() { updateAlignments(); } });
    $(".draggable-element").draggable("disable");
});

const hudMenu = document.getElementById('hud-menu');
const editOverlay = document.getElementById('edit-overlay');

function closeMenu() {
    if(hudMenu) hudMenu.style.display = 'none';
    if (!document.body.classList.contains('edit-mode-active')) {
        fetch(`https://${resourceName}/closeMenu`, { method: 'POST', body: JSON.stringify({}) });
    }
}

function toggleEditMode(enable) {
    const modernHud = document.querySelector('.style-modern-container');
    if (enable) {
        document.body.classList.add('edit-mode-active');
        if(editOverlay) editOverlay.style.display = 'block';
        $(".draggable-element").draggable("enable");
        $('#vehicle-hud').css('display', 'flex'); 
        if(hudMenu) hudMenu.style.display = 'none';
        
        $('.style-rect-container, #drag-status-bar-rounded, .style-modern-container').hide();
        $('#drag-armor').hide();

        let savedStyle = localStorage.getItem(HUD_STYLE_KEY) || 'rect';
        if (savedStyle === 'round' || savedStyle === 'true') { $('#drag-status-bar-rounded').css('display', 'flex'); } 
        else if (savedStyle === 'modern') { if(modernHud) { modernHud.style.display = 'flex'; modernHud.style.transform = 'none'; } } 
        else {
            $('.style-rect-container').css('display', 'flex');
            const rectArmor = document.getElementById('drag-armor');
            if(rectArmor) rectArmor.style.setProperty('display', 'block', 'important');
        }
    } else {
        document.body.classList.remove('edit-mode-active');
        if(editOverlay) editOverlay.style.display = 'none';
        $(".draggable-element").draggable("disable");
        $('#vehicle-hud').css('display', '');
        if(modernHud) { modernHud.style.transform = ''; }
        const savedStyle = localStorage.getItem(HUD_STYLE_KEY) || 'rect';
        updateHudStyle(savedStyle); 
    }
}

document.getElementById('close-menu-btn').addEventListener('click', closeMenu);
document.getElementById('edit-hud-btn').addEventListener('click', () => toggleEditMode(true));

document.getElementById('save-positions-btn').addEventListener('click', () => {
    const positions = {};
    $('.draggable-element').each(function() {
        const id = $(this).attr('id');
        const pos = $(this).position();
        positions[id] = { left: (pos.left / $(window).width()) * 100, top: (pos.top / $(window).height()) * 100 };
    });
    localStorage.setItem(HUD_POSITIONS_KEY, JSON.stringify(positions));
    toggleEditMode(false);
    fetch(`https://${resourceName}/closeMenu`, { method: 'POST', body: JSON.stringify({}) });
    applySafeZoneLogic();
});

document.getElementById('reset-positions-btn').addEventListener('click', () => {
    localStorage.removeItem(HUD_POSITIONS_KEY);
    $('.draggable-element').removeAttr('style'); 
    updateAlignments();
    const currentStyle = localStorage.getItem(HUD_STYLE_KEY) || 'rect';
    updateHudStyle(currentStyle);
    const currentInfo = localStorage.getItem(HUD_INFO_STYLE_KEY) || 'right';
    updateInfoStyle(currentInfo);
    applySafeZoneLogic(); 
});

document.getElementById('refresh-btn').addEventListener('click', () => {
    fetch(`https://${resourceName}/refreshHud`, { method: 'POST', body: JSON.stringify({}) });
    closeMenu(); 
});

document.onkeyup = function (data) { 
    if (data.which == 27) { 
        if(document.body.classList.contains('edit-mode-active')) { toggleEditMode(false); closeMenu(); } 
        else { closeMenu(); }
    } 
};

const toggles = { 'minimap': 'setMinimapMode', 'cinematic': 'toggleCinematic', 'hud': 'toggleHud', 'compass': 'toggleCompass' };
for (const [id, endpoint] of Object.entries(toggles)) {
    let el = document.getElementById(`${id}-toggle`);
    if(el) {
        el.addEventListener('change', function() {
            let body = {};
            if (id === 'minimap') body = { mode: this.checked ? "always" : "vehicle" };
            else body = { state: this.checked };
            if (id === 'cinematic') {
                if(this.checked) document.body.classList.add('cinematic-active'); else document.body.classList.remove('cinematic-active');
            } else if (id === 'hud') {
                if(this.checked) document.body.classList.add('hud-hidden'); else document.body.classList.remove('hud-hidden');
            } else if (id === 'compass') {
                if(!this.checked) document.body.classList.add('compass-hidden'); else document.body.classList.remove('compass-hidden');
                body = { state: !this.checked }; 
                let savedPrefs = JSON.parse(localStorage.getItem(HUD_PREFS_KEY) || "{}");
                savedPrefs.showCompass = this.checked;
                localStorage.setItem(HUD_PREFS_KEY, JSON.stringify(savedPrefs));
            }
            fetch(`https://${resourceName}/${endpoint}`, { method: 'POST', body: JSON.stringify(body) });
        });
    }
}

window.addEventListener('message', function(event) {
    let data = event.data;

    if (data.action === "togglePause") {
        if (data.state) {
            isPaused = true;
            document.body.classList.add('hud-paused');
        } else {
            isPaused = false;
            document.body.classList.remove('hud-paused');
        }
        checkMasterVisibility();
    }

    if (data.action === "updateVisibility") {
        document.body.classList.remove('cinematic-active', 'hud-hidden');
        let savedPrefs = JSON.parse(localStorage.getItem(HUD_PREFS_KEY) || "{}");
        if (savedPrefs.showCompass === false) { document.body.classList.add('compass-hidden'); } 
        else { document.body.classList.remove('compass-hidden'); }
    }

    if (data.action === "updateCompass" && !isPaused) {
        let heading = parseFloat(data.heading); 
        if (isNaN(heading)) heading = 0;

        let strip = document.getElementById('compass-strip');
        let degreeBox = document.getElementById('compass-degree');
        if (strip && degreeBox) {
            degreeBox.textContent = Math.floor(heading);
            let currentOffset = (heading * pixelsPerDegree); 
            strip.style.transform = `translateX(-${currentOffset}px)`;
        }

        const topHeading = document.getElementById('top-heading');
        if(topHeading) {
            const directions = ["N", "NW", "W", "SW", "S", "SE", "E", "NE"];
            const index = Math.floor(((heading + 22.5) % 360) / 45);
            topHeading.innerText = directions[index] || "N";
        }
    }

    if (data.action === "updateServerName" && !isPaused) {
        const el = document.getElementById('area-server');
        if (el) { el.innerText = data.name; }
    }
    
    if (data.action === "updateInfo" && !isPaused) {
        let locationText = data.street || '...';
        let zoneText = data.zone || '';
        if (data.zone) locationText += ' | ' + data.zone; 
        document.getElementById('street').textContent = locationText;
        document.getElementById('player-name').textContent = data.name;
        document.getElementById('player-id').textContent = data.id;
        document.getElementById('cash').textContent = formatMoney(data.cash);
        document.getElementById('bank').textContent = formatMoney(data.bank);
        document.getElementById('job-label').textContent = data.job;
        let d = new Date();
        let timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        document.getElementById('time').textContent = timeStr;
        document.getElementById('date').textContent = d.getDate().toString().padStart(2, '0') + '.' + (d.getMonth() + 1).toString().padStart(2, '0');
        document.getElementById('top-street').textContent = data.street || 'Unknown';
        document.getElementById('top-zone').textContent = zoneText;
        document.getElementById('top-player-name').textContent = data.name;
        document.getElementById('top-player-id').textContent = data.id;
        document.getElementById('top-time').textContent = timeStr;
        document.getElementById('top-cash').textContent = formatMoney(data.cash) + " $";
        document.getElementById('top-bank').textContent = formatMoney(data.bank) + " $";
    }

    if (data.action === "updateStatus" && !isPaused) {
        let tHealth = data.health < 0 ? 0 : (data.health > 100 ? 100 : data.health);
        let tArmor = data.armor || 0;
        const modMicIcon = document.getElementById('modern-mic-icon');
        const micBoxIcon = document.querySelector('#mic-box i');
        const micIconR = document.getElementById('mic-icon-r');
        if(data.talking) { 
            if(modMicIcon) modMicIcon.classList.add('talking-green'); 
            if(micBoxIcon) micBoxIcon.classList.add('talking');
            if(micIconR) micIconR.classList.add('talking');
        } else { 
            if(modMicIcon) modMicIcon.classList.remove('talking-green'); 
            if(micBoxIcon) micBoxIcon.classList.remove('talking');
            if(micIconR) micIconR.classList.remove('talking');
        }
        updateAllBars(tHealth, tArmor, data.hunger, data.thirst, data.stamina);
        let isEditMode = document.body.classList.contains('edit-mode-active');
        let shouldShowArmor = isEditMode || (tArmor > 0);
        let rectArmor = document.getElementById('drag-armor');
        if (rectArmor) {
            rectArmor.dataset.value = tArmor; 
            if (document.body.classList.contains('style-rect')) {
                if (shouldShowArmor) rectArmor.style.setProperty('display', 'block', 'important');
                else rectArmor.style.setProperty('display', 'none', 'important');
            } else { rectArmor.style.setProperty('display', 'none', 'important'); }
        }

        if (data.isArmed) {
            $("#ammo-hud").fadeIn(200).css("display", "flex");
            $("#ammo-clip").text(data.ammoClip);
            $("#ammo-reserve").text(data.ammoTotal);
        } else {
            $("#ammo-hud").fadeOut(200);
        }
    }

    if (data.action === "voiceMode" && !isPaused) {
        let micCircle = document.getElementById('mic-circle-stroke-r');
        let levelsRound = { 1: 33, 2: 66, 3: 100 };
        let currentFill = levelsRound[data.value] || 66;
        if(micCircle) micCircle.style.strokeDashoffset = (100 - currentFill);
        let voiceText = document.getElementById('voice-percent');
        if(voiceText) voiceText.textContent = currentFill + "%";
        let rangeFill = document.getElementById('voice-range-fill');
        let heightLevels = { 1: '33%', 2: '66%', 3: '100%' };
        let classLevels = { 1: 'voice-level-1', 2: 'voice-level-2', 3: 'voice-level-3' };
        if (rangeFill) {
            rangeFill.style.height = heightLevels[data.value];
            rangeFill.classList.remove('voice-level-1', 'voice-level-2', 'voice-level-3');
            rangeFill.classList.add(classLevels[data.value]);
        }
        const modernMicVal = document.getElementById('modern-mic-val');
        const labels = { 1: "Fısıltı", 2: "Normal", 3: "Bağır" };
        if(modernMicVal) modernMicVal.innerText = labels[data.value] || "Normal";
        const d1 = document.getElementById('range-dash-1');
        const d2 = document.getElementById('range-dash-2');
        const d3 = document.getElementById('range-dash-3');
        if(d1 && d2 && d3) {
            d1.classList.remove('active'); d2.classList.remove('active'); d3.classList.remove('active');
            if(data.value >= 1) d1.classList.add('active');
            if(data.value >= 2) d2.classList.add('active');
            if(data.value >= 3) d3.classList.add('active');
        }
    }
    
    if (data.action === "vehicleUpdate") {
        let hud = document.getElementById('vehicle-hud');
        let shouldShow = (data.show && !data.isCinematic && !data.isHudHidden && !isPaused) || document.body.classList.contains('edit-mode-active');
        
        const isVehNameEnabled = document.getElementById('toggle-veh-name') ? document.getElementById('toggle-veh-name').checked : true;

        if (shouldShow) {
            hud.style.display = "flex";
            document.getElementById('speed').textContent = data.speed;

            $(".fuel-wrapper").show();
            $(".right-wrapper").show();
            $(".rpm-wrapper").css('opacity', '1');
            document.getElementById('gear').style.fontSize = ""; 

            const nameEl = document.getElementById('vehicle-name-label');
            if (nameEl) {
                if (isVehNameEnabled) {
                    nameEl.style.display = 'block';
                    nameEl.innerText = data.vehicleName || '';
                } else {
                    nameEl.style.display = 'none';
                }
            }
            if (data.class === 13) {
                $(".fuel-wrapper").hide();      
                $(".right-wrapper").hide();     
                $(".rpm-wrapper").css('opacity', '0'); 
            } 
            else if (data.class === 15 || data.class === 16) {
                let alt = data.altitude || 0;
                let gearBox = document.getElementById('gear');
                gearBox.textContent = alt + "m";
                gearBox.style.fontSize = "18px";
            } 
            else {
                document.getElementById('gear').textContent = data.gear;
            }

            if (data.class !== 13) {
                const rpmBars = document.querySelectorAll('.rpm-bar');
                const totalBars = rpmBars.length;
                const activeBars = Math.floor(data.rpm * totalBars);
                rpmBars.forEach((bar, index) => {
                    if (index < activeBars) {
                        bar.classList.add('active');
                        if (index >= totalBars - 3) bar.classList.add('red'); else bar.classList.remove('red');
                    } else { bar.classList.remove('active', 'red'); }
                });

                const fuelFill = document.getElementById('fuel-fill-vertical'); 
                if(fuelFill) { 
                     fuelFill.style.height = data.fuel + "%"; 
                     let saturation = 100 - data.fuel;       
                     let lightness = 50 + (data.fuel / 2);    
                     let dynamicColor = `hsl(35, ${saturation}%, ${lightness}%)`;
                     fuelFill.style.backgroundColor = dynamicColor;
                     fuelFill.style.boxShadow = `0 0 10px ${dynamicColor}`;
                     fuelFill.classList.remove('low');
                }

                const lightIcon = document.getElementById('light-icon');
                const beltIcon = document.getElementById('belt-icon');
                const cruiseIcon = document.getElementById('cruise-icon');
                
                if(lightIcon) {
                    lightIcon.className = "fa-solid fa-lightbulb";
                    if(data.lights === 2) lightIcon.classList.add('active-blue'); else if(data.lights === 1) lightIcon.classList.add('active-green'); 
                }
                if(beltIcon) {
                    if(data.belt) beltIcon.className = "fa-solid fa-user-shield active-green"; else beltIcon.className = "fa-solid fa-user-slash active-red";
                }
                if(cruiseIcon) {
                    cruiseIcon.className = "fa-solid fa-gauge-high";
                    if(data.cruise) cruiseIcon.classList.add('active-green');
                }
            }
            if (data.vehicleHealth !== undefined) {
                let vh = Math.round(data.vehicleHealth / 10); 
                if (vh < 0) vh = 0;
                const vhText = document.getElementById('vehicle-health-percent');
                const vhIcon = document.querySelector('.health-icon-veh');
                
                if (vhText) vhText.textContent = vh + "%";
                if (vhIcon) {
                    if (vh > 60) vhIcon.style.color = "#2ecc71";
                    else if (vh > 30) vhIcon.style.color = "#f1c40f";
                    else vhIcon.style.color = "#e74c3c";
                }
            }
        } else { 
            hud.style.display = "none"; 
            const nameEl = document.getElementById('vehicle-name-label');
            if(nameEl) nameEl.style.display = 'none';
        }
    }
    
    if (data.action === "updateMinimapState") {
        isInVehicle = data.show; 
        let minimapBorder = document.getElementById('minimap-border');
        if (minimapBorder) {
            if (data.show && !document.body.classList.contains('hud-hidden') && !isPaused) minimapBorder.classList.add('show');
            else minimapBorder.classList.remove('show');
        }
        applySafeZoneLogic(); 
    }

    if (data.action === "setDefaults") {
        const savedStyle = localStorage.getItem(HUD_STYLE_KEY);
        if (savedStyle === null) {
            updateHudStyle(data.defaultStyle);
        } else {
            updateHudStyle(savedStyle);
        }

        const savedInfoStyle = localStorage.getItem(HUD_INFO_STYLE_KEY);
        if (savedInfoStyle === null) {
            updateInfoStyle(data.defaultInfo);
        } else {
            updateInfoStyle(savedInfoStyle);
        }
    }
    if (data.action === "setServerConfig") {
        const serverConfig = data.config;
        console.log("Sunucu konfigürasyonu alındı:", serverConfig); 

        for (const [key, isEnabled] of Object.entries(serverConfig)) {
            if (hudToggles[key]) {
                hudToggles[key].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && !isEnabled) {
                        el.style.setProperty('display', 'none', 'important');
                        el.classList.add('server-disabled'); 
                    }
                });
            }

            const menuInput = document.getElementById(key);
            if (menuInput && !isEnabled) {
                const wrapper = menuInput.closest('.setting-item-compact') || menuInput.closest('.setting-item');
                if (wrapper) {
                    wrapper.style.setProperty('display', 'none', 'important');
                    console.log(key + " menüden kaldırıldı."); 
                }
            }
        }
    } 

    if (data.action === "openMenu") { document.getElementById('hud-menu').style.display = 'flex'; }
    if (data.action === "closeMenu") { document.getElementById('hud-menu').style.display = 'none'; toggleEditMode(false); }
});

function updateAllBars(h, a, hu, t, s) {
    const healthFill = document.getElementById('health-fill-solid');
    if (healthFill) { healthFill.style.width = h + "%"; }

    const armorFill = document.getElementById('armor-fill-solid');
    if (armorFill) { armorFill.style.width = a + "%"; }

    if (typeof window.lastHealth === 'undefined') { window.lastHealth = 100; }

    const mh = document.getElementById('modern-health-fill');
    const icon = document.querySelector('.modern-health-icon-box i');
    let color = '#ff3e3e'; let shadowColor = '255, 62, 62';

    if (h > 70) { color = '#4caf50'; shadowColor = '76, 175, 80'; } 
    else if (h > 30) { color = '#ff9800'; shadowColor = '255, 152, 0'; }

    if(mh) { mh.style.width = h + "%"; mh.style.backgroundColor = color; mh.style.boxShadow = `0 0 8px rgba(${shadowColor}, 0.7)`; }
    if(icon) {
        icon.style.color = color; icon.style.filter = `drop-shadow(0 0 5px rgba(${shadowColor}, 0.4))`;
        if (h < window.lastHealth) { icon.classList.remove('shake-active'); void icon.offsetWidth; icon.classList.add('shake-active'); }
    }
    window.lastHealth = h;
    const mt = document.getElementById('modern-health-text'); if(mt) mt.textContent = Math.round(h) + "%";
    
    document.getElementById('modern-armor-val').innerText = Math.round(a) + "%";
    document.getElementById('modern-hunger-val').innerText = Math.round(hu) + "%";
    document.getElementById('modern-thirst-val').innerText = Math.round(t) + "%";
    document.getElementById('modern-stamina-val').innerText = Math.round(s) + "%";
    document.getElementById('hunger-val').innerText = Math.round(hu);
    document.getElementById('thirst-val').innerText = Math.round(t);
    document.getElementById('stamina-val').innerText = Math.round(s);
    
    const ids = {'health-circle-stroke-r': h, 'armor-circle-stroke-r': a, 'hunger-circle-stroke-r': hu, 'thirst-circle-stroke-r': t, 'stamina-circle-stroke-r': s};
    for (const [key, val] of Object.entries(ids)) { const el = document.getElementById(key); if(el) el.style.strokeDashoffset = (100 - val); }
    
    document.getElementById('health-percent').textContent = Math.round(h) + "%";
    document.getElementById('armor-percent').textContent = Math.round(a) + "%";
    document.getElementById('hunger-percent').textContent = Math.round(hu) + "%";
    document.getElementById('thirst-percent').textContent = Math.round(t) + "%";
    document.getElementById('stamina-percent').textContent = Math.round(s) + "%";

    let isEditMode = document.body.classList.contains('edit-mode-active');
    let shouldShowArmor = isEditMode || (a > 0);
    let rectArmor = document.getElementById('drag-armor');
    if (rectArmor && document.body.classList.contains('style-rect')) {
        rectArmor.style.display = shouldShowArmor ? 'flex' : 'none';
    }
}