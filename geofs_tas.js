// GeoFS A350 - Native AP IAS Integrator
// Format: JavaScript (V8 Engine)

(function() {
    console.clear();
    console.log("IAS AP Integrator Loaded.");

    const existingUI = document.getElementById("simpleAirspeedUI");
    if (existingUI) existingUI.remove();
    if (window.iasHoldInterval) clearInterval(window.iasHoldInterval);

    const ui = document.createElement("div");
    ui.id = "simpleAirspeedUI";
    Object.assign(ui.style, {
        position: "fixed",
        bottom: "30px",
        right: "30px",
        backgroundColor: "rgba(10, 15, 20, 0.95)",
        border: "1px solid #00ff88",
        color: "#fff",
        padding: "15px",
        borderRadius: "8px",
        fontFamily: "Consolas, monospace",
        fontSize: "15px",
        zIndex: "10000",
        boxShadow: "0px 0px 20px rgba(0, 255, 136, 0.25)",
        width: "220px",
        userSelect: "none"
    });

    ui.innerHTML = `
        <div id="dataDisplay"></div>
        <hr style="border: 0; border-top: 1px solid #444; margin: 12px 0;">
        <div style="color: #fff; font-size: 13px; margin-bottom: 5px;">TARGET IAS (KNOTS)</div>
        <div style="display: flex; gap: 10px;">
            <input type="number" id="targetIasInput" value="286" style="width: 70px; background: #222; color: #00ff88; border: 1px solid #555; border-radius: 4px; padding: 4px; font-family: Consolas; font-weight: bold; font-size: 14px; text-align: center;">
            <button id="iasEngageBtn" style="flex-grow: 1; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-family: Consolas; font-weight: bold; transition: 0.2s;">ENGAGE</button>
        </div>
        <div id="apStatus" style="color: #ffaa00; font-size: 12px; margin-top: 8px; text-align: center; font-weight: bold;">SYSTEM STANDBY</div>
    `;
    
    document.body.appendChild(ui);

    // State Variables
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
                
                // Calculate required TAS for your target IAS
                let requiredTasKts = targetIas * Math.sqrt(densitySeaLevel / density);
                
                let isMachMode = geofs.autopilot.speedMode === "mach";
                let targetValue;

                // If game is in Mach mode (high altitude), convert required TAS into Mach
                if (isMachMode) {
                    let speedOfSound_kts = Math.sqrt(1.4 * 287.05 * tempK) * 1.943844;
                    targetValue = requiredTasKts / speedOfSound_kts;
                } else {
                    targetValue = requiredTasKts;
                }

                let currentApTarget = geofs.autopilot.values.speed || 0;
                let threshold = isMachMode ? 0.001 : 0.5;

                // If the game's current target is wrong, type the new one in!
                if (Math.abs(targetValue - currentApTarget) > threshold) {
                    let finalVal = isMachMode ? parseFloat(targetValue.toFixed(3)) : Math.round(targetValue);
                    
                    // The official command to update the game's autopilot
                    geofs.autopilot.setSpeed(finalVal);
                    
                    // Update our status panel so you know it's working
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
