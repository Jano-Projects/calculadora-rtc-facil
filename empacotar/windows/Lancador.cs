// ==========================================================================
//  Calculadora RTC Fácil — lançador do Windows (CalculadoraRTC.exe)
//
//  É o programa que os atalhos da Área de Trabalho e do Menu Iniciar abrem.
//  Não tem janela de console. Ele faz o que o iniciar.bat fazia, sem o terminal:
//
//    1. Pasta de dados: %LOCALAPPDATA%\CalculadoraRTC (a pasta do programa, em
//       "Arquivos de Programas", não é gravável). O Java, o motor oficial e os
//       logs ficam lá; o caminho vai para o PowerShell e o Java em CALC_RTC_DADOS.
//    2. Java: na primeira vez (e a cada 90 dias, para receber as correções de
//       segurança) roda "iniciar.ps1 --so-java" numa janela VISÍVEL, que mostra o
//       download de ~200 MB. Nas outras vezes, essa etapa é pulada.
//    3. Sobe o gerenciador ESCONDIDO ("iniciar.ps1 --atalho"). Ele abre o navegador,
//       mostra a preparação do motor oficial na própria tela e se encerra sozinho
//       quando a última aba da calculadora é fechada. Se a calculadora já estiver
//       aberta, ele só abre o navegador nela.
//
//  CalculadoraRTC.exe --encerrar   encerra a calculadora aberta (atalho "Encerrar"
//                                  do Menu Iniciar; o desinstalador também usa)
//  Outras opções são repassadas ao gerenciador (ex.: --porta 9000, --rede; a homologação
//  da CI usa --sem-navegador e --api-externa).
//
//  Compilar (o compilador já vem no Windows, com o .NET Framework 4):
//    %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:winexe /codepage:65001
//      /win32icon:..\icone\calculadora-rtc.ico /r:System.Windows.Forms.dll /out:CalculadoraRTC.exe Lancador.cs
//  Escrito em C# 5 de propósito: é a versão que esse compilador embutido entende.
//  /codepage:65001 faz o compilador ler este arquivo como UTF-8 (sem isso, os acentos
//  das mensagens saem trocados).
// ==========================================================================
using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("Calculadora RTC Fácil")]
[assembly: System.Reflection.AssemblyProduct("Calculadora RTC Fácil - CBS, IBS e Imposto Seletivo")]
[assembly: System.Reflection.AssemblyCopyright("Projeto Jano - MIT")]

static class Lancador
{
    const int DiasJava = 90;               // mesma regra do iniciar.ps1
    const string Titulo = "Calculadora RTC";

    [STAThread]
    static int Main(string[] args)
    {
        string pasta = AppDomain.CurrentDomain.BaseDirectory;
        string script = Path.Combine(Path.Combine(pasta, "scripts"), "iniciar.ps1");

        // 1. pasta de dados do usuário, repassada ao PowerShell e ao Java pela variável de ambiente
        string dados = Environment.GetEnvironmentVariable("CALC_RTC_DADOS");
        if (string.IsNullOrEmpty(dados))
            dados = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CalculadoraRTC");
        Environment.SetEnvironmentVariable("CALC_RTC_DADOS", dados);
        Directory.CreateDirectory(Path.Combine(dados, "logs"));

        if (args.Length > 0 && args[0] == "--encerrar")
            return Encerrar(dados, args.Length > 1 && args[1] == "--silencioso");

        if (!File.Exists(script))
        {
            Aviso("Não encontrei os arquivos da calculadora em:\n" + script + "\n\nReinstale a Calculadora RTC.");
            return 2;
        }

        // 2. Java portátil, numa janela visível (mostra o andamento do download)
        if (PrecisaJava(dados))
        {
            Rodar(script, "--so-java", false, true);
            if (!File.Exists(Path.Combine(Path.Combine(Path.Combine(dados, "jdk"), "bin"), "java.exe")))
            {
                Aviso("Não consegui baixar o Java que a calculadora usa.\n\nVerifique a internet (ou o proxy da empresa) e abra a calculadora de novo.");
                return 1;
            }
        }

        // 3. gerenciador escondido; ele abre o navegador sozinho
        string extras = "";
        foreach (string a in args) extras += " \"" + a.Replace("\"", "") + "\"";
        Rodar(script, "--atalho" + extras, true, false);
        return 0;
    }

    /// Falta o Java, ou a cópia tem mais de DiasJava dias (a data fica em jdk\.baixado-em).
    static bool PrecisaJava(string dados)
    {
        string jdk = Path.Combine(dados, "jdk");
        if (!File.Exists(Path.Combine(Path.Combine(jdk, "bin"), "java.exe"))) return true;
        string marca = Path.Combine(jdk, ".baixado-em");
        if (!File.Exists(marca)) return true;
        DateTime baixado;
        if (!DateTime.TryParse(File.ReadAllText(marca).Trim(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out baixado))
            return true;
        return (DateTime.Now - baixado).TotalDays > DiasJava;
    }

    /// Roda o iniciar.ps1 com uma opção. oculto = sem janela; esperar = aguarda terminar.
    static void Rodar(string script, string opcao, bool oculto, bool esperar)
    {
        string argumentos = "-NoProfile -ExecutionPolicy Bypass " + (oculto ? "-WindowStyle Hidden " : "")
                          + "-File \"" + script + "\" " + opcao;
        ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", argumentos);
        psi.UseShellExecute = false;
        psi.CreateNoWindow = oculto;
        try
        {
            Process p = Process.Start(psi);
            if (esperar) p.WaitForExit();
        }
        catch (Exception erro)
        {
            Aviso("Não consegui iniciar o PowerShell, que a calculadora usa:\n" + erro.Message);
        }
    }

    /// Pede à calculadora aberta que se encerre (POST /painel/encerrar na porta gravada em painel.porta)
    /// e espera ela soltar os arquivos, para o desinstalador conseguir apagá-los.
    static int Encerrar(string dados, bool silencioso)
    {
        string arquivo = Path.Combine(dados, "painel.porta");
        if (File.Exists(arquivo))
        {
            try
            {
                string porta = File.ReadAllText(arquivo).Trim();
                using (WebClient cliente = new WebClient())
                {
                    cliente.Proxy = null;   // é no próprio computador: o proxy da empresa não deve entrar
                    cliente.UploadString("http://127.0.0.1:" + porta + "/painel/encerrar", "POST", "");
                }
                for (int i = 0; i < 30 && File.Exists(arquivo); i++) Thread.Sleep(500);
                Thread.Sleep(1500);   // o Java do motor oficial termina logo depois do painel
                return 0;
            }
            catch (Exception)
            {
                // arquivo de uma execução que já terminou: segue como "não está aberta"
            }
        }
        if (!silencioso) Aviso("A calculadora não está aberta.");
        return 0;
    }

    static void Aviso(string texto)
    {
        MessageBox.Show(texto, Titulo, MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }
}
