@echo off
rem ===========================================================================
rem  Calculadora RTC Facil - Windows
rem  De dois cliques neste arquivo. Deixe a janela aberta enquanto usa.
rem  Para criar atalho na Area de Trabalho:  iniciar.bat --criar-atalho
rem ===========================================================================
chcp 65001 >nul
title Calculadora RTC
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1" %*
