// GeoFS A350 - Native AP IAS Integrator (Draggable + Branded)
// by: a-flying-cow
// Format: JavaScript (V8 Engine)

(function() {
    console.clear();
    console.log("IAS AP Integrator by: a-flying-cow Loaded.");

    document.getElementById("simpleAirspeedUI")?.remove();
    document.getElementById("iasToggleBtn")?.remove();
    if (window.iasHoldInterval) clearInterval(window.iasHoldInterval);

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "iasToggleBtn";
    toggleBtn.innerText = "IAS";
    Object.assign(toggleBtn.style, {
        position: "fixed",
        bottom: "20px",
        right: "70px", 
        zIndex: "10000",
        backgroundColor: "#00ff88",
        color: "#000",
        border: "1px solid #00ff88",
        borderRadius: "4px",
        padding: "5px 10px",
        cursor: "pointer",
        fontFamily: "Consolas, monospace",
        fontWeight: "bold",
        boxShadow: "0px 0px 10px rgba(0, 255, 136, 0.2)"
    });
    document.body.appendChild(toggleBtn);

    const ui = document.createElement("div");
    ui.id = "simpleAirspeedUI";
    Object.assign(ui.style, {
        position: "fixed",
        bottom: "60px", 
        right: "30px",
        backgroundColor: "rgba(10, 15, 20, 0.95)",
        border: "1px solid #00ff88",
        color: "#fff",
        borderRadius: "8px",
        fontFamily: "Consolas, monospace",
        fontSize: "15px",
        zIndex: "10000",
        boxShadow: "0px 0px 20px rgba(0, 255, 136, 0.25)",
        width: "220px",
        userSelect: "none",
        display: "block" 
    });

    // Added "by: a-flying-cow" to the header
    ui.innerHTML = `
        <div id="iasDragHeader" style="background: #222; padding: 6px 10px; cursor: move; border-radius: 8px 8px 0 0; font-size: 12px; color: #aaa; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">:: IAS AUTOPILOT <span style="font-weight: normal; font-size: 10px; color: #777; margin-left: 4px;">by: a-flying-cow</span></span>
            <span id="iasCloseBtn" style="cursor: pointer; color: #ff5555; font-size: 18px; line-height: 12px;">&times;</span>
        </div>
        <div style="padding: 15px;">
            <div id="dataDisplay"></div>
            <hr style="border: 0; border-top: 1px solid #444; margin: 12px 0;">
            <div style="color: #fff; font-size: 13px; margin-bottom: 5px;">TARGET IAS (KNOTS)</div>
            <div style="display: flex; gap: 10px;">
                <input type="number" id="targetIasInput" value="286" style="width: 70px; background: #222; color: #00ff88; border: 1px solid #555; border-radius: 4px; padding: 4px; font-family: Consolas; font-weight: bold; font-size: 14px; text-align: center;">
                <button id="iasEngageBtn" style="flex-grow: 1; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-family: Consolas; font-weight: bold; transition: 0.2s;">ENGAGE</button>
            </div>
            <div id="apStatus" style="color: #ffaa00; font-size: 12px; margin-top: 8px; text-align: center; font-weight: bold;">SYSTEM STANDBY</div>
        </div>
    `;
    document.body.appendChild(ui);

    // --- DRAG LOGIC ---
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    const dragHeader = document.getElementById("iasDragHeader");

    dragHeader.addEventListener("mousedown", (e) => {
        isDragging = true;
        dragOffsetX = e.clientX - ui.getBoundingClientRect().left;
        dragOffsetY = e.clientY - ui.getBoundingClientRect().top;
        e.stopPropagation(); 
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        ui.style.bottom = "auto"; 
        ui.style.right = "auto";  
        ui.style.left = (e.clientX - dragOffsetX) + "px";
        ui.style.top = (e.clientY - dragOffsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });

    // --- MINIMIZE/TOGGLE LOGIC ---
    const closeBtn = document.getElementById("iasCloseBtn");
    
    function toggleUI() {
        if (ui.style.display === "none") {
            ui.style.display = "block";
            toggleBtn.style.backgroundColor = "#00ff88";
            toggleBtn.style.color = "#000";
        } else {
            ui.style.display = "none";
            toggleBtn.style.backgroundColor = "rgba(0,0,0,0.6)";
            toggleBtn.style.color = "#00ff88";
        }
    }

    toggleBtn.onclick = toggleUI;
    closeBtn.onclick = toggleUI; 

    // --- AP STATE VARIABLES ---
    window.customIasHoldActive = false;
    const engageBtn = document.getElementById("iasEngageBtn");
    const statusText = document.getElementById("apStatus");
    const dataDisplay = document.getElementById("dataDisplay");
    const iasInput = document.getElementById("targetIasInput");

    // UI Button Logic
    engageBtn.onclick = () => {
        window.customIasHoldActive = !window.customIasHoldActive;
        if (window.customIasHoldActive) {
            engageBtn.style.background = "#00ff88";
            engageBtn.style.color = "#000";
            engageBtn.innerText = "ACTIVE";
            statusText.innerText = "WAITING FOR NATIVE AP...";
            statusText.style.color = "#00ff88";
        } else {
            engageBtn.style.background = "#333";
            engageBtn.style.color = "#fff";
            engageBtn.innerText = "ENGAGE";
            statusText.innerText = "SYSTEM STANDBY";
            statusText.style.color = "#ffaa00";
        }
    };

    // --- MASTER LOOP ---
    window.iasHoldInterval = setInterval(function() {
        if (!window.geofs || !geofs.aircraft || !geofs.aircraft.instance) return;

        // --- MATH & DATA ---
        let tas_ms = geofs.aircraft.instance.trueAirSpeed || 0;
        let tasKts = tas_ms * 1.943844; 
        let altFt = (geofs.aircraft.instance.llaLocation?.[2] || 0) * 3.28084;
        let mach = geofs.animation?.values?.mach || 0;

        let calcAlt = Math.min(altFt, 36089); 
        let tempK = 288.15 - (0.0019812 * calcAlt); 
        let pressure = 101325 * Math.pow(tempK / 288.15, 5.25588);
        let density = pressure / (287.05 * tempK);
        let densitySeaLevel = 1.225;

        let currentIas = tasKts * Math.sqrt(density / densitySeaLevel);

        // Update Visuals
        dataDisplay.innerHTML = `
            <div style="color: #00ff88; font-weight: bold; font-size: 18px;">IAS:  ${Math.round(currentIas)} KT</div>
            <div style="color: #00bfff; font-weight: bold;">TAS:  ${Math.round(tasKts)} KT</div>
            <div style="color: #ffaa00; font-weight: bold;">MACH: ${mach.toFixed(3)}</div>
            <div style="color: #aaaaaa; font-size: 14px; margin-top: 4px;">ALT:  ${Math.round(altFt).toLocaleString()} FT</div>
        `;

        // --- NATIVE AUTOPILOT CONTROL ---
        if (window.customIasHoldActive && geofs.autopilot && geofs.autopilot.on) {
            let targetIas = parseFloat(iasInput.value);
            
            if (!isNaN(targetIas) && typeof geofs.autopilot.setSpeed === "function") {
                
                let requiredTasKts = targetIas * Math.sqrt(densitySeaLevel / density);
                let isMachMode = geofs.autopilot.speedMode === "mach";
                let targetValue;

                if (isMachMode) {
                    let speedOfSound_kts = Math.sqrt(1.4 * 287.05 * tempK) * 1.943844;
                    targetValue = requiredTasKts / speedOfSound_kts;
                } else {
                    targetValue = requiredTasKts;
                }

                let currentApTarget = geofs.autopilot.values.speed || 0;
                let threshold = isMachMode ? 0.001 : 0.5;

                if (Math.abs(targetValue - currentApTarget) > threshold) {
                    let finalVal = isMachMode ? parseFloat(targetValue.toFixed(3)) : Math.round(targetValue);
                    geofs.autopilot.setSpeed(finalVal);
                    statusText.innerText = "SENDING " + (isMachMode ? "MACH " + finalVal : finalVal + " KT");
                } else {
                    statusText.innerText = "AP TARGET SYNCHED";
                }
            }
        } else if (window.customIasHoldActive) {
            statusText.innerText = "TURN ON GAME AUTOPILOT!";
            statusText.style.color = "#ff0000";
        }

    }, 200);

})();
