local QBCore = exports['qb-core']:GetCoreObject()
local PlayerData = QBCore.Functions.GetPlayerData()

local seatbeltOn = false
local cruiseOn = false
local cruiseSpeed = 0 
local inVehicle = false 
local minimapMode = "vehicle" 
local isMapVisible = false 

local isCinematic = false
local isHudHidden = false
local isCompassHidden = false 

local lastVehicleEntity = nil
local cachedVehicleName = ""

local IsLoggedIn = false

local function SetupRectMinimap()
    CreateThread(function()
        RequestStreamedTextureDict("squaremap", false)
        while not HasStreamedTextureDictLoaded("squaremap") do 
            Wait(10) 
        end

        AddReplaceTexture('platform:/textures/graphics', 'radarmasksm', 'squaremap', 'radarmasksm')
        AddReplaceTexture('platform:/textures/graphics', 'radarmask1g', 'squaremap', 'radarmasksm')

        SetMinimapComponentPosition('minimap', 'L', 'B', 0.0, -0.047, 0.1638, 0.183)
        SetMinimapComponentPosition('minimap_mask', 'L', 'B', 0.0, 0.0, 0.128, 0.20)
        SetMinimapComponentPosition('minimap_blur', 'L', 'B', -0.01, 0.025, 0.262, 0.300)

        SetMinimapClipType(0) 
        SetBlipAlpha(GetNorthRadarBlip(), 0)

        SetRadarBigmapEnabled(true, false)
        Wait(50)
        SetRadarBigmapEnabled(false, false)
        SetRadarZoom(1100)
    end)
end

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    IsLoggedIn = true
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    IsLoggedIn = false
end)

RegisterCommand('hudfix', function()
    SetNuiFocus(false, false)
    isCinematic = false
    isHudHidden = false
    isCompassHidden = false
    SendNUIMessage({ action = "closeMenu" })
    SendNUIMessage({ action = "updateVisibility", isCinematic = false, isHudHidden = false, isCompassHidden = false })
    SetupRectMinimap() 
    QBCore.Functions.Notify("HUD ve Harita resetlendi.", "success")
end)

RegisterCommand('hud', function()
    SetNuiFocus(true, true)
    SendNUIMessage({ 
        action = "openMenu", 
        currentMode = minimapMode,
        isCinematic = isCinematic,
        isHudHidden = isHudHidden,
        isCompassHidden = isCompassHidden
    })
end)

RegisterCommand('togglecruise', function()
    local ped = PlayerPedId()
    if IsPedInAnyVehicle(ped, false) then
        local vehicle = GetVehiclePedIsIn(ped, false)
        if GetPedInVehicleSeat(vehicle, -1) == ped then
            local currentSpeed = GetEntitySpeed(vehicle)
            if cruiseOn then
                cruiseOn = false
                cruiseSpeed = 0
                SetVehicleMaxSpeed(vehicle, 0.0)
                QBCore.Functions.Notify("Hız Sabitleme İptal", "error")
            else
                if (currentSpeed * Config.SpeedMultiplier) > 20 then
                    cruiseOn = true
                    cruiseSpeed = currentSpeed
                    SetVehicleMaxSpeed(vehicle, cruiseSpeed)
                    QBCore.Functions.Notify("Hız Sabitlendi: " .. math.floor(currentSpeed * Config.SpeedMultiplier) .. " km/h", "success")
                else
                    QBCore.Functions.Notify("Hız sabitlemek için çok yavaşsın.", "error")
                end
            end
        end
    end
end)
RegisterKeyMapping('togglecruise', 'Hız Sabitleme', 'keyboard', 'Y')

CreateThread(function()
    while true do
        Wait(1000)
        if cruiseOn then
            local ped = PlayerPedId()
            if not IsPedInAnyVehicle(ped, false) then
                cruiseOn = false
                cruiseSpeed = 0
            end
        end
    end
end)

RegisterNUICallback('closeMenu', function(_, cb) SetNuiFocus(false, false); cb('ok') end)
RegisterNUICallback('setMinimapMode', function(data, cb)
    minimapMode = data.mode
    if minimapMode == "always" and not isCinematic and not isHudHidden then
        DisplayRadar(true)
        SetupRectMinimap()
    end
    cb('ok')
end)
RegisterNUICallback('toggleCinematic', function(data, cb) isCinematic = data.state; cb('ok') end)
RegisterNUICallback('toggleHud', function(data, cb) isHudHidden = data.state; cb('ok') end)
RegisterNUICallback('toggleCompass', function(data, cb) isCompassHidden = data.state; cb('ok') end)
RegisterNUICallback('refreshHud', function(_, cb) ExecuteCommand('hudfix'); cb('ok') end)

CreateThread(function()
    local minimap = RequestScaleformMovie("minimap")
    while not HasScaleformMovieLoaded(minimap) do Wait(10) end
    while true do
        Wait(500)
        BeginScaleformMovieMethod(minimap, "SETUP_HEALTH_ARMOUR")
        ScaleformMovieMethodAddParamInt(3) 
        EndScaleformMovieMethod()
    end
end)

CreateThread(function()
    while true do
        Wait(0) 
        if not IsPauseMenuActive() then
            HideHudComponentThisFrame(6); HideHudComponentThisFrame(7); HideHudComponentThisFrame(8)
            HideHudComponentThisFrame(9); HideHudComponentThisFrame(2); HideHudComponentThisFrame(22); HideHudComponentThisFrame(20)
            HideHudComponentThisFrame(3); HideHudComponentThisFrame(4);
        end
    end
end)

local lastPauseState = false

CreateThread(function()
    DisplayRadar(false)
    while true do
        Wait(100)
        
        local isPaused = IsPauseMenuActive()
        
        if isPaused ~= lastPauseState then
            lastPauseState = isPaused
            SendNUIMessage({
                action = "togglePause", 
                state = isPaused
            })
        end

        if not isPaused then
            local ped = PlayerPedId()
            local isInVeh = IsPedInAnyVehicle(ped, false)
            local shouldShow = false
            
            if not isCinematic and not isHudHidden then
                if minimapMode == "always" or isInVeh then
                    shouldShow = true
                end
            end

            if shouldShow ~= isMapVisible then
                isMapVisible = shouldShow
                DisplayRadar(shouldShow)
                if shouldShow then 
                    SetupRectMinimap() 
                end
            end
            
            if isMapVisible and isInVeh then SetRadarZoom(1100) end
        else
            if isMapVisible then
                isMapVisible = false
                DisplayRadar(false)
            end
        end
    end
end)

local ElectricVehicles = {
    [GetHashKey('voltic')] = true, [GetHashKey('voltic2')] = true, [GetHashKey('raiden')] = true,
    [GetHashKey('neon')] = true, [GetHashKey('cyclone')] = true, [GetHashKey('cyclone2')] = true,
    [GetHashKey('tezeract')] = true, [GetHashKey('dilettante')] = true, [GetHashKey('khamelion')] = true,
    [GetHashKey('imorgon')] = true, [GetHashKey('iwagen')] = true, [GetHashKey('omnisegt')] = true,
    [GetHashKey('envisage')] = true, [GetHashKey('surge')] = true, [GetHashKey('virtue')] = true,
    [GetHashKey('powersurge')] = true, [GetHashKey('pipistrello')] = true, [GetHashKey('airtug')] = true,
    [GetHashKey('caddy')] = true, [GetHashKey('caddy2')] = true, [GetHashKey('caddy3')] = true,
    [GetHashKey('rcbandito')] = true
}

local function GetFuelLevel(vehicle)
    if Config.FuelSystem == 'LegacyFuel' then return exports['LegacyFuel']:GetFuel(vehicle)
    elseif Config.FuelSystem == 'lc-fuel' then return exports['lc_fuel']:GetFuel(vehicle)
    else return GetVehicleFuelLevel(vehicle) end
end

CreateThread(function()
    while true do
        local ped = PlayerPedId()
        local isInVehNow = IsPedInAnyVehicle(ped, false)

        if isInVehNow and not inVehicle then inVehicle = true; Wait(100)
        elseif not isInVehNow and inVehicle then inVehicle = false end
        
        if isInVehNow then
            local vehicle = GetVehiclePedIsIn(ped, false)
            
            if vehicle ~= lastVehicleEntity then
                lastVehicleEntity = vehicle
                cachedVehicleName = nil
                
                local model = GetEntityModel(vehicle)
                if QBCore.Shared and QBCore.Shared.Vehicles then
                    for k, v in pairs(QBCore.Shared.Vehicles) do
                        if tonumber(v.hash) == model or GetHashKey(v.model) == model then
                            local brand = v.brand or ""
                            local name = v.name or ""
                            if brand ~= "" then cachedVehicleName = brand .. " " .. name
                            else cachedVehicleName = name end
                            break
                        end
                    end
                end
                if not cachedVehicleName then
                    local brand = GetLabelText(GetDisplayNameFromVehicleModel(model))
                    if brand == "NULL" then brand = GetDisplayNameFromVehicleModel(model) end
                    cachedVehicleName = brand
                end
            end
            
            local speed = math.ceil(GetEntitySpeed(vehicle) * Config.SpeedMultiplier)
            local rpm = GetVehicleCurrentRpm(vehicle)
            local gear = GetVehicleCurrentGear(vehicle)
            if gear == 0 then gear = "R" end
            local fuel = GetFuelLevel(vehicle)
            
            local _, lightsOn, highBeams = GetVehicleLightsState(vehicle)
            local lightStatus = 0
            if lightsOn == 1 then lightStatus = 1 end
            if highBeams == 1 then lightStatus = 2 end
            
            local model = GetEntityModel(vehicle)
            local isElectric = ElectricVehicles[model] or false
            local vClass = GetVehicleClass(vehicle)
            local altitude = (vClass == 15 or vClass == 16) and math.ceil(GetEntityHeightAboveGround(vehicle)) or 0

            SendNUIMessage({
                action = "vehicleUpdate",
                show = true, 
                speed = speed, rpm = rpm, gear = gear,
                fuel = fuel, 
                vehicleHealth = GetVehicleEngineHealth(vehicle),
                lights = lightStatus, belt = seatbeltOn,
                cruise = cruiseOn,
                isElectric = isElectric, class = vClass, altitude = altitude,
                isCinematic = isCinematic, isHudHidden = isHudHidden,
                vehicleName = cachedVehicleName
            })
            Wait(50) 
        else
            SendNUIMessage({ action = "vehicleUpdate", show = false })
            Wait(1000) 
        end
    end
end)

CreateThread(function()
    while true do
        Wait(200)
        if LocalPlayer.state.isLoggedIn then
            local ped = PlayerPedId()
            local playerStats = QBCore.Functions.GetPlayerData().metadata
            local stamina = 100 - GetPlayerSprintStaminaRemaining(PlayerId())
            local isTalking = NetworkIsPlayerTalking(PlayerId())
            local weapon = GetSelectedPedWeapon(ped)
            local isArmed = false
            local ammoClip, ammoTotal = 0, 0
            if IsPedArmed(ped, 4) then
                local hasClip, clip = GetAmmoInClip(ped, weapon)
                if hasClip then isArmed = true; ammoClip = clip; ammoTotal = GetAmmoInPedWeapon(ped, weapon) - clip end
            end

            SendNUIMessage({
                action = "updateStatus",
                health = GetEntityHealth(ped) - 100, armor = GetPedArmour(ped),
                hunger = playerStats["hunger"], thirst = playerStats["thirst"],
                stamina = stamina, talking = isTalking, 
                isArmed = isArmed, ammoClip = ammoClip, ammoTotal = ammoTotal,
                isCinematic = isCinematic, isHudHidden = isHudHidden
            })
            
            local pos = GetEntityCoords(ped)
            local streetName = GetStreetNameFromHashKey(GetStreetNameAtCoord(pos.x, pos.y, pos.z))
            
            local jobLabel = PlayerData.job.label
            if PlayerData.job.grade and PlayerData.job.grade.name then
                jobLabel = jobLabel .. " - " .. PlayerData.job.grade.name
            end

            SendNUIMessage({
                action = "updateInfo",
                cash = PlayerData.money['cash'] or 0, bank = PlayerData.money['bank'] or 0,
                job = jobLabel,
                id = GetPlayerServerId(PlayerId()),
                street = streetName, name = PlayerData.charinfo.firstname .. " " .. PlayerData.charinfo.lastname
            })
        end
    end
end)

CreateThread(function()
    while true do
        Wait(50) 
        local ped = PlayerPedId()
        if not IsPauseMenuActive() then
            local heading = 360.0 - GetEntityHeading(ped)
            SendNUIMessage({
                action = "updateCompass",
                heading = heading
            })
        end
    end
end)


RegisterNetEvent('pma-voice:setTalkingMode', function(mode) SendNUIMessage({ action = "voiceMode", value = mode }) end)
RegisterNetEvent('seatbelt:client:ToggleSeatbelt', function() 
    seatbeltOn = not seatbeltOn 
    if seatbeltOn then QBCore.Functions.Notify("Kemer Takıldı", "success")
    else QBCore.Functions.Notify("Kemer Çıkarıldı", "error") end
end)
RegisterNetEvent('qb-smallresources:client:ToggleCruise', function() ExecuteCommand('togglecruise') end) 
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function() PlayerData = QBCore.Functions.GetPlayerData() SetupRectMinimap() end)
RegisterNetEvent('QBCore:Client:OnMoneyChange', function() PlayerData = QBCore.Functions.GetPlayerData() end)
RegisterNetEvent('QBCore:Client:OnJobUpdate', function(JobInfo) PlayerData.job = JobInfo end)


local lastVehCheck = false

CreateThread(function()
    while true do
        Wait(100) 
        local ped = PlayerPedId()
        local isNowInVehicle = IsPedInAnyVehicle(ped, false)

        if isNowInVehicle ~= lastVehCheck then
            lastVehCheck = isNowInVehicle
            
            SendNUIMessage({
                action = "updateMinimapState",
                show = isNowInVehicle 
            })

            if not isNowInVehicle and minimapMode == "vehicle" then
                DisplayRadar(false)
            end
            
            if isNowInVehicle then
                DisplayRadar(true) 
                SetupRectMinimap() 
            end
        end
    end
end)


local warningActive = false 

CreateThread(function()
    while true do
        local sleep = 2000 
        
        if inVehicle then
            sleep = 500 
            if seatbeltOn then
                sleep = 0
                DisableControlAction(0, 75, true)
                if IsDisabledControlJustPressed(0, 75) then
                    QBCore.Functions.Notify("Kemer takılıyken inemezsin!", "error")
                end
                warningActive = false
            else
                local ped = PlayerPedId()
                local vehicle = GetVehiclePedIsIn(ped, false)
                if vehicle ~= 0 then
                    local vClass = GetVehicleClass(vehicle)
                    if vClass ~= 8 and vClass ~= 13 and vClass ~= 14 and vClass ~= 15 and vClass ~= 16 then
                        local speed = GetEntitySpeed(vehicle) * Config.SpeedMultiplier
                        if speed > 40.0 then 
                            PlaySoundFrontend(-1, "ATM_WINDOW", "HUD_FRONTEND_DEFAULT_SOUNDSET", 1)
                            if not warningActive then
                                QBCore.Functions.Notify("Lütfen kemerinizi takınız!", "error")
                                warningActive = true
                            end
                            sleep = 1000 
                        else
                            warningActive = false 
                        end
                    else
                        warningActive = false
                    end
                end
            end
        else
            warningActive = false 
        end
        Wait(sleep)
    end
end)


RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    IsLoggedIn = true
    SendNUIMessage({
        action = "setDefaults",
        defaultStyle = Config.DefaultHudStyle,
        defaultInfo = Config.DefaultInfoStyle
    })
end)

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    SendNUIMessage({
        action = "setServerConfig",
        config = Config.Settings
    })
end)

local function refreshServerConfig()
    SendNUIMessage({
        action = "setServerConfig",
        config = Config.Settings
    })
end

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    Wait(1000) 
    refreshServerConfig()
end)

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        Wait(1000)
        refreshServerConfig()
    end
end)