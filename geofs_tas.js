// ==UserScript==
// @name         GeoFS A350 Autopilot & PMDG Alarm
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Custom IAS Autopilot Integrator with PMDG Overspeed Alarm
// @author       a-flying-cow
// @match        *://*.geo-fs.com/*
// @match        *://geo-fs.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function initCustomAutopilot() {
        console.log("IAS AP Integrator by: a-flying-cow Loaded.");

        const CUSTOM_ALARM_URL = "https://cdn.discordapp.com/attachments/1417051542225424468/1504040254191960084/pmdg_777_masterwarning.mp3?ex=6a058a24&is=6a0438a4&hm=967abc05e43de2b628381fa6339a1d1fed8991c8419d71ccc0d6e62c3cc25d5d&";

        if (document.getElementById("simpleAirspeedUI")) return;

        window.overspeedAudio = new Audio(CUSTOM_ALARM_URL);
        window.overspeedAudio.loop = true;
        window.overspeedAudio.volume = 0.5;
        let isAlarmPlaying = false;

        function startAlarm() {
            if (isAlarmPlaying) return;
            isAlarmPlaying = true;
            let p = window.overspeedAudio.play();
            if (p !== undefined) p.catch(function() {});
            ui.style.border = "2px solid #ff0000";
            ui.style.boxShadow = "0px 0px 30px rgba(255, 0, 0, 0.6)";
        }

        function stopAlarm() {
            if (!isAlarmPlaying) return;
            isAlarmPlaying = false;
            window.overspeedAudio.pause();
            window.overspeedAudio.currentTime = 0;
            ui.style.border = "1px solid #00ff88";
            ui.style.boxShadow = "0px 0px 20px rgba(0, 255, 136, 0.25)";
        }

        const toggleBtn = document.createElement("button");
        toggleBtn.innerText = "IAS";
        Object.assign(toggleBtn.style, {
            position: "fixed", bottom: "20px", right: "70px", zIndex: "10000",
            backgroundColor: "#00ff88", color: "#000", border: "1px solid #00ff88",
            borderRadius: "4px", padding: "5px 10px", cursor: "pointer",
            fontFamily: "Consolas, monospace", fontWeight: "bold"
        });
        document.body.appendChild(toggleBtn);

        const ui = document.createElement("div");
        ui.id = "simpleAirspeedUI";
        Object.assign(ui.style, {
            position: "fixed", bottom: "60px", right: "30px",
            backgroundColor: "rgba(10, 15, 20, 0.95)", border: "1px solid #00ff88",
            color: "#fff", borderRadius: "8px", fontFamily: "Consolas, monospace",
            fontSize: "15px", zIndex: "10000", width: "220px", userSelect: "none"
        });

        ui.innerHTML =
            "<div id='iasDragHeader' style='background: #222; padding: 6px 10px; cursor: move; border-radius: 8px 8px 0 0; font-size: 12px; color: #aaa; border-bottom: 1px solid #444; display: flex; justify-content: space-between;'>" +
                "<span style='font-weight: bold;'>:: IAS AUTOPILOT <span style='font-weight: normal; font-size: 10px; color: #777;'>by: a-flying-cow</span></span>" +
                "<span id='iasCloseBtn' style='cursor: pointer; color: #ff5555; font-size: 18px; line-height: 12px;'>&times;</span>" +
            "</div>" +
            "<div style='padding: 15px;'>" +
                "<div id='dataDisplay'></div>" +
                "<hr style='border: 0; border-top: 1px solid #444; margin: 12px 0;'>" +
                "<div style='color: #fff; font-size: 13px; margin-bottom: 5px;'>TARGET IAS (KNOTS)</div>" +
                "<div style='display: flex; gap: 10px;'>" +
                    "<input type='number' id='targetIasInput' value='286' style='width: 70px; background: #222; color: #00ff88; border: 1px solid #555; text-align: center; font-family: Consolas; font-weight: bold;'>" +
                    "<button id='iasEngageBtn' style='flex-grow: 1; background: #333; color: #fff; cursor: pointer; border: 1px solid #555; font-family: Consolas; font-weight: bold;'>ENGAGE</button>" +
                "</div>" +
                "<div id='apStatus' style='color: #ffaa00; font-size: 12px; margin-top: 8px; text-align: center; font-weight: bold;'>SYSTEM STANDBY</div>" +
            "</div>";

        document.body.appendChild(ui);

        let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
        document.getElementById("iasDragHeader").addEventListener("mousedown", function(e) {
            isDragging = true;
            dragOffsetX = e.clientX - ui.getBoundingClientRect().left;
            dragOffsetY = e.clientY - ui.getBoundingClientRect().top;
            e.stopPropagation();
        });
        document.addEventListener("mousemove", function(e) {
            if (!isDragging) return;
            ui.style.bottom = "auto"; ui.style.right = "auto";
            ui.style.left = (e.clientX - dragOffsetX) + "px";
            ui.style.top = (e.clientY - dragOffsetY) + "px";
        });
        document.addEventListener("mouseup", function() { isDragging = false; });

        function toggleUI() {
            ui.style.display = ui.style.display === "none" ? "block" : "none";
            toggleBtn.style.backgroundColor = ui.style.display === "none" ? "rgba(0,0,0,0.6)" : "#00ff88";
            toggleBtn.style.color = ui.style.display === "none" ? "#00ff88" : "#000";
        }
        toggleBtn.onclick = toggleUI;
        document.getElementById("iasCloseBtn").onclick = toggleUI;

        window.customIasHoldActive = false;
        const engageBtn = document.getElementById("iasEngageBtn");
        const statusText = document.getElementById("apStatus");
        const dataDisplay = document.getElementById("dataDisplay");
        const iasInput = document.getElementById("targetIasInput");

        engageBtn.onclick = function() {
            if (window.overspeedAudio.paused) {
                let p = window.overspeedAudio.play();
                if (p !== undefined) p.then(function() { window.overspeedAudio.pause(); window.overspeedAudio.currentTime = 0; }).catch(function(){});
            }
            window.customIasHoldActive = !window.customIasHoldActive;
            engageBtn.style.background = window.customIasHoldActive ? "#00ff88" : "#333";
            engageBtn.style.color = window.customIasHoldActive ? "#000" : "#fff";
            engageBtn.innerText = window.customIasHoldActive ? "ACTIVE" : "ENGAGE";
            statusText.innerText = window.customIasHoldActive ? "WAITING FOR NATIVE AP..." : "SYSTEM STANDBY";
            statusText.style.color = window.customIasHoldActive ? "#00ff88" : "#ffaa00";
        };

        setInterval(function() {
            if (!window.geofs || !geofs.aircraft || !geofs.aircraft.instance) return;

            let tasKts = (geofs.aircraft.instance.trueAirSpeed || 0) * 1.943844;

            let altMeters = 0;
            if (geofs.aircraft.instance.llaLocation && geofs.aircraft.instance.llaLocation[2]) {
                altMeters = geofs.aircraft.instance.llaLocation[2];
            }
            let altFt = altMeters * 3.28084;

            let mach = 0;
            if (geofs.animation && geofs.animation.values && geofs.animation.values.mach) {
                mach = geofs.animation.values.mach;
            }

            let calcAlt = Math.min(altFt, 36089);
            let tempK = 288.15 - (0.0019812 * calcAlt);
            let density = (101325 * Math.pow(tempK / 288.15, 5.25588)) / (287.05 * tempK);
            let currentIas = tasKts * Math.sqrt(density / 1.225);

            let isOverspeeding = currentIas > 340 || (altFt < 10000 && currentIas > 250);
            isOverspeeding ? startAlarm() : stopAlarm();

            let formattedMach = mach ? mach.toFixed(3) : "0.000";
            let formattedAlt = Math.round(altFt).toLocaleString();

            dataDisplay.innerHTML =
                "<div style='color: " + (isOverspeeding ? '#ff0000' : '#00ff88') + "; font-weight: bold; font-size: 18px;'>IAS:  " + Math.round(currentIas) + " KT</div>" +
                "<div style='color: #00bfff; font-weight: bold;'>TAS:  " + Math.round(tasKts) + " KT</div>" +
                "<div style='color: #ffaa00; font-weight: bold;'>MACH: " + formattedMach + "</div>" +
                "<div style='color: #aaaaaa; font-size: 14px; margin-top: 4px;'>ALT:  " + formattedAlt + " FT</div>";

            if (window.customIasHoldActive && geofs.autopilot && geofs.autopilot.on) {
                let targetIas = parseFloat(iasInput.value);
                if (!isNaN(targetIas) && typeof geofs.autopilot.setSpeed === "function") {
                    let reqTas = targetIas * Math.sqrt(1.225 / density);
                    let isMachMode = geofs.autopilot.speedMode === "mach";
                    let targetValue = isMachMode ? (reqTas / (Math.sqrt(1.4 * 287.05 * tempK) * 1.943844)) : reqTas;

                    if (Math.abs(targetValue - (geofs.autopilot.values.speed || 0)) > (isMachMode ? 0.001 : 0.5)) {
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
    }

    // Wait for GeoFS to fully load before injecting the script
    let checkLoaded = setInterval(function() {
        if (window.geofs && window.geofs.aircraft) {
            clearInterval(checkLoaded);
            initCustomAutopilot();
        }
    }, 1000);
})();
