$taskName = "PollaMundialistaSync"
$projectDir = "C:\Users\usuario\OneDrive\Documents\ANDRES HUERTAS FANTASIAS\polla-mundialista"
$nodePath = (Get-Command node).Source

# Tarea cada hora
$actionHourly = New-ScheduledTaskAction -Execute "$nodePath" -Argument "$projectDir\scripts\cron-worker.js"
$triggerHourly = New-ScheduledTaskTrigger -Daily -At "00:00" -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)

# Tarea al iniciar sesión (inicia el servidor si no está corriendo)
$actionStartup = New-ScheduledTaskAction -Execute "$nodePath" -Argument "$projectDir\scripts\cron-worker.js"
$triggerStartup = New-ScheduledTaskTrigger -AtStartup

# Eliminar si existe
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Crear tarea
Register-ScheduledTask -TaskName $taskName -Action $actionHourly -Trigger $triggerHourly -RunLevel Highest -User "SYSTEM"

Write-Host "Tarea '$taskName' creada - ejecuta sync cada hora"
