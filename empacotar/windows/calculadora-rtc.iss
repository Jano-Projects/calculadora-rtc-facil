; ==========================================================================
;  Calculadora RTC Fácil — instalador do Windows (Inno Setup 6)
;
;  Gera:  saida\CalculadoraRTC-<versão>-instalador-windows.exe
;  O assistente clássico (Avançar > Avançar > Concluir), em português:
;    - instala só para o usuário, sem pedir administrador (o assistente oferece "para todos");
;    - cria atalhos no Menu Iniciar ("Calculadora RTC" e "Encerrar a Calculadora RTC")
;      e, se marcado, na Área de Trabalho;
;    - registra o desinstalador em "Aplicativos instalados".
;  O instalador é pequeno: o Java e a calculadora oficial são baixados na primeira
;  abertura, em %LOCALAPPDATA%\CalculadoraRTC (o CalculadoraRTC.exe mostra o andamento).
;  Ao desinstalar, a calculadora aberta é encerrada e essa pasta é apagada.
;
;  Montar (o GitHub Actions faz isso sozinho ao criar uma tag v*):
;    1. compile Lancador.cs para build\windows\CalculadoraRTC.exe (veja o cabeçalho do .cs)
;    2. iscc /DVersao=1.7.0 empacotar\windows\calculadora-rtc.iss
;  Este arquivo é UTF-8 com BOM: é assim que o Inno Setup lê os acentos.
; ==========================================================================

#ifndef Versao
  #define Versao "0.0.0"
#endif
#define Raiz "..\.."

[Setup]
AppId={{3B8E5C1D-7A2F-4E9B-8D6C-51F0A2C4E7B9}
AppName=Calculadora RTC Fácil
AppVersion={#Versao}
AppVerName=Calculadora RTC Fácil {#Versao}
AppPublisher=Projeto Jano
AppPublisherURL=https://github.com/Jano-Projects/calculadora-rtc-facil
AppSupportURL=https://github.com/Jano-Projects/calculadora-rtc-facil/issues
AppComments=CBS, IBS e Imposto Seletivo pela calculadora oficial da Receita Federal
DefaultDirName={autopf}\Calculadora RTC
DefaultGroupName=Calculadora RTC
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
LicenseFile={#Raiz}\LICENSE
OutputDir={#Raiz}\saida
OutputBaseFilename=CalculadoraRTC-{#Versao}-instalador-windows
SetupIconFile={#Raiz}\empacotar\icone\calculadora-rtc.ico
UninstallDisplayIcon={app}\CalculadoraRTC.exe
UninstallDisplayName=Calculadora RTC Fácil
WizardStyle=modern
Compression=lzma2/ultra64
SolidCompression=yes
; o lançador pode estar aberto (atualização por cima): o instalador pede para fechar
CloseApplications=yes

[Languages]
Name: "pt"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "atalho"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#Raiz}\build\windows\CalculadoraRTC.exe";        DestDir: "{app}";         Flags: ignoreversion
Source: "{#Raiz}\empacotar\icone\calculadora-rtc.ico";      DestDir: "{app}";         Flags: ignoreversion
Source: "{#Raiz}\app\CalculadoraRTC.java";                  DestDir: "{app}\app";     Flags: ignoreversion
Source: "{#Raiz}\scripts\iniciar.ps1";                      DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#Raiz}\web\*";                                    DestDir: "{app}\web";     Flags: ignoreversion recursesubdirs
Source: "{#Raiz}\LICENSE";                                  DestDir: "{app}";         DestName: "LICENCA.txt"

[Icons]
Name: "{group}\Calculadora RTC";                 Filename: "{app}\CalculadoraRTC.exe"; IconFilename: "{app}\calculadora-rtc.ico"; Comment: "CBS, IBS e Imposto Seletivo da Reforma Tributária"
Name: "{group}\Encerrar a Calculadora RTC";      Filename: "{app}\CalculadoraRTC.exe"; Parameters: "--encerrar"; IconFilename: "{app}\calculadora-rtc.ico"; Comment: "Fecha a calculadora que está aberta"
Name: "{group}\Desinstalar a Calculadora RTC";   Filename: "{uninstallexe}"
Name: "{autodesktop}\Calculadora RTC";           Filename: "{app}\CalculadoraRTC.exe"; IconFilename: "{app}\calculadora-rtc.ico"; Comment: "CBS, IBS e Imposto Seletivo da Reforma Tributária"; Tasks: atalho

[Run]
Filename: "{app}\CalculadoraRTC.exe"; Description: "Abrir a Calculadora RTC agora (na primeira vez, baixa o Java e prepara a calculadora oficial)"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; fecha a calculadora aberta antes de apagar os arquivos
Filename: "{app}\CalculadoraRTC.exe"; Parameters: "--encerrar --silencioso"; RunOnceId: "Encerrar"; Flags: runhidden waituntilterminated

[UninstallDelete]
; Java portátil, motor oficial e logs (~1 GB), baixados na primeira abertura. Os itens das notas ficam
; no navegador e não são apagados.
Type: filesandordirs; Name: "{localappdata}\CalculadoraRTC"
