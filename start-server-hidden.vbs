Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strServerPath = strScriptPath & "\server.js"

' Ejecutar node server.js sin mostrar ventana
WshShell.Run "cmd /c cd /d """ & strScriptPath & """ && node server.js", 0, False
