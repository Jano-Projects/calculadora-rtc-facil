/* Exemplos prontos. Os códigos (NCM × cClassTrib) foram conferidos na base oficial da calculadora.
 * Os preços são estimativas de mercado; troque pelos seus.
 * Imposto Seletivo: alíquotas de 2027 da MP 1.399/2026 (bebidas açucaradas 2,6%; cerveja de malte 4,2%). */
/* Formato de cada exemplo: { nome, local: { uf, municipio (código IBGE) }, emitente?: { regime, rbt12, ativServ, ... }
 * (painel Quem emite a nota; ausente = não muda o painel), antesDepois?: { iss }, itens: [linha, ...] }.
 * Cada linha: [descrição, NCM ou NBS, cClassTrib, valor (R$), quantidade, unidade, alíquota do IS % (opcional), "nbs" para serviço].
 * cClassTrib usados aqui (base oficial): 000001 tributação integral; 200003 cesta básica nacional (Anexo I da LC 214,
 * alíquota zero); 200014 hortícolas, frutas e ovos (Anexo XV, alíquota zero); 200028 educação (Anexo II), 200034
 * alimentos (Anexo VII) e 200035 higiene pessoal e limpeza (Anexo VIII), com redução de 60%. Lista completa na aba Ajuda. */
window.EXEMPLOS = {
  cesta: {
    nome: "Cesta básica completa",
    local: { uf: "SP", municipio: 3533403 },
    itens: [
      ["Arroz tipo 1 5 kg", "10063021", "200003", 29.90, 5, "KG"],
      ["Feijão carioca 1 kg", "07133399", "200003", 8.49, 1, "KG"],
      ["Feijão preto 1 kg", "07133319", "200003", 9.99, 1, "KG"],
      ["Açúcar 5 kg", "17019900", "200003", 22.90, 5, "KG"],
      ["Café torrado e moído 500 g", "09012100", "200003", 24.90, 0.5, "KG"],
      ["Leite UHT integral 12 × 1 L", "04012010", "200003", 59.88, 12, "LT"],
      ["Manteiga 200 g", "04051000", "200003", 14.90, 0.2, "KG"],
      ["Margarina 500 g", "15171000", "200003", 8.99, 0.5, "KG"],
      ["Farinha de trigo 1 kg", "11010010", "200003", 5.49, 1, "KG"],
      ["Farinha de mandioca 1 kg", "11062000", "200003", 7.99, 1, "KG"],
      ["Fubá 1 kg", "11022000", "200003", 4.99, 1, "KG"],
      ["Macarrão 500 g", "19021900", "200003", 4.79, 0.5, "KG"],
      ["Pão francês 1 kg", "19059090", "200003", 16.90, 1, "KG"],
      ["Sal 1 kg", "25010020", "200003", 2.99, 1, "KG"],
      ["Carne bovina desossada 2 kg", "02013000", "200003", 79.80, 2, "KG"],
      ["Coxa e sobrecoxa de frango 2 kg", "02071412", "200003", 25.80, 2, "KG"],
      ["Ovos 30 unidades", "04072100", "200014", 21.90, 30, "UN"],
      ["Batata 2 kg", "07019000", "200014", 11.98, 2, "KG"],
      ["Tomate 1 kg", "07020000", "200014", 7.99, 1, "KG"],
      ["Banana 1 kg", "08039000", "200014", 6.99, 1, "KG"],
      ["Cebola 1 kg", "07031019", "200014", 5.99, 1, "KG"],
      ["Óleo de soja 900 ml", "15079011", "200034", 7.49, 0.9, "LT"]
    ]
  },
  diaadia: {
    nome: "Compras do dia a dia (com Imposto Seletivo)",
    local: { uf: "SP", municipio: 3533403 },
    itens: [
      ["Chocolate ao leite 90 g", "18063210", "000001", 7.99, 0.09, "KG"],
      ["Biscoito recheado 140 g", "19053100", "000001", 3.49, 0.14, "KG"],
      ["Sorvete pote 1,5 L", "21050010", "000001", 24.90, 1.5, "LT"],
      ["Shampoo 400 ml", "33051000", "000001", 18.90, 0.4, "LT"],
      ["Desodorante roll-on", "33072010", "000001", 15.90, 1, "UN"],
      ["Ração para cachorro 15 kg", "23091000", "000001", 149.90, 15, "KG"],
      ["Fone de ouvido", "85183000", "000001", 129.90, 1, "UN"],
      ["Creme dental 90 g", "33061000", "200035", 4.99, 1, "UN"],
      ["Sabonete", "34011190", "200035", 2.49, 1, "UN"],
      ["Papel higiênico 12 rolos", "48181000", "200035", 21.90, 12, "UN"],
      ["Refrigerante 2 L", "22021000", "000001", 10.00, 2, "LT", 2.6],
      ["Cerveja 12 latas 350 ml", "22030000", "000001", 42.00, 4.2, "LT", 4.2]
    ]
  },
  servicos: {
    nome: "Serviços de uma empresa do lucro presumido",
    local: { uf: "SP", municipio: 3533403 },
    // PIS/Cofins cumulativo (3,65%) e ISS: é o caso em que a troca por CBS mais pesa
    emitente: { regime: "presumido" },
    antesDepois: { iss: 5 },
    itens: [
      ["Consultoria em TI (8 horas)", "115011000", "000001", 1600.00, null, null, null, "nbs"],
      ["Limpeza do escritório (mensal)", "118031000", "000001", 900.00, null, null, null, "nbs"],
      ["Manutenção de veículo (mão de obra)", "120013110", "000001", 450.00, null, null, null, "nbs"]
    ]
  },
  simples: {
    nome: "Serviço de uma microempresa do Simples Nacional",
    local: { uf: "SP", municipio: 3550308 },
    // Anexo III (atividade 07), 1ª faixa: DAS de 6% da receita. Em 2026, sem CBS e IBS. De 2027 em diante, dentro do
    // DAS: CBS de 0,9258% e IBS de 0,0102% da receita (na NFS-e as alíquotas vão com 2 casas: 0,93% e 0,01%)
    emitente: { regime: "simples", rbt12: 120000, ativServ: "07", opcao: "dentro", issRetido: false },
    antesDepois: { iss: 5 },
    itens: [
      ["Suporte em tecnologia da informação (mensal)", "115013000", "000001", 10027.50, null, null, null, "nbs"]
    ]
  },
  oficial: {
    nome: "Exemplo da documentação oficial",
    local: { uf: "RS", municipio: 4314902 },
    itens: [
      ["Arroz (cesta básica)", "10063021", "200003", 100.00, 20, "KG"],
      ["Cerveja (com Imposto Seletivo)", "22030000", "000001", 150.00, 12, "LT", 4.2],
      ["Serviço de educação", "122011200", "200028", 1200.00, null, null, null, "nbs"]
    ]
  }
};
