@echo off
rem ===========================================================================
rem  Calculadora RTC Facil - Windows
rem  De dois cliques neste arquivo. Deixe a janela aberta enquanto usa.
rem  Para criar atalho na Area de Trabalho:  iniciar.bat --criar-atalho
rem ===========================================================================
rem chcp 65001: terminal em UTF-8, para os acentos das mensagens aparecerem certos
chcp 65001 >nul
title Calculadora RTC
rem Todo o trabalho fica no scripts\iniciar.ps1 (baixa o Java portatil e abre o gerenciador).
rem -ExecutionPolicy Bypass vale so para este script; %* repassa as opcoes (ex.: --porta 9000).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1" %*
