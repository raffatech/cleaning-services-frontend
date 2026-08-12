 // Registra o service worker para habilitar instalação e cache offline

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
    const API_URL = 'https://web-production-620ff.up.railway.app';

    let tipoSelecionado    = null;  // 'recibo' ou 'orcamento'
    let emitterIdSelecionado = null;
    let contadorItens      = 0;    // ID único para cada card de item

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    document.addEventListener('DOMContentLoaded', function () {

      // Tela 1 → escolha do tipo
      document.getElementById('card-tipo-recibo').addEventListener('click', function () {
        tipoSelecionado = 'recibo';
        irPara('tela-selecao');
      });
      document.getElementById('card-tipo-orcamento').addEventListener('click', function () {
        tipoSelecionado = 'orcamento';
        irPara('tela-selecao');
      });

      // Tela 2 → botão voltar e escolha do emitente
      document.getElementById('btn-voltar-tipo').addEventListener('click', function () { irPara('tela-tipo'); });
      document.getElementById('card-igor').addEventListener('click', function () {
        selecionarEmitente(1, 'Igor Rodrigues dos Santos', 'Cleaner Rodrigues');
      });
      document.getElementById('card-joel').addEventListener('click', function () {
        selecionarEmitente(2, 'Joel Saldanha de Cruz', 'Talento Vitrines');
      });

      // Tela recibo
      document.getElementById('btn-voltar-recibo').addEventListener('click', function () { irPara('tela-selecao'); });
      document.getElementById('btn-gerar-recibo').addEventListener('click', gerarRecibo);

      // Tela orçamento
      document.getElementById('btn-voltar-orcamento').addEventListener('click', function () { irPara('tela-selecao'); });
      document.getElementById('btn-add-item').addEventListener('click', adicionarItem);
      document.getElementById('btn-gerar-orcamento').addEventListener('click', gerarOrcamento);
      document.getElementById('desconto').addEventListener('input', atualizarTotais);

      // começa com um item já visível para facilitar
      adicionarItem();
    });

    // ============================================================
    // NAVEGAÇÃO
    // ============================================================
    function irPara(idTela) {
      document.querySelectorAll('.tela').forEach(function (t) { t.classList.remove('ativa'); });
      document.getElementById(idTela).classList.add('ativa');
      window.scrollTo(0, 0);
    }

    function selecionarEmitente(id, nome, empresa) {
      emitterIdSelecionado = id;
      if (tipoSelecionado === 'recibo') {
        document.getElementById('nome-emitente-recibo').textContent    = nome;
        document.getElementById('empresa-emitente-recibo').textContent = empresa;
        limparFormularioRecibo();
        irPara('tela-recibo');
      } else {
        document.getElementById('nome-emitente-orcamento').textContent    = nome;
        document.getElementById('empresa-emitente-orcamento').textContent = empresa;
        irPara('tela-orcamento');
      }
    }

    // ============================================================
    // RECIBO
    // ============================================================
    function limparFormularioRecibo() {
      document.getElementById('numero-recibo').value      = '';
      document.getElementById('nome-cliente-recibo').value = '';
      document.getElementById('valor-recibo').value        = '';
      esconderMensagens('recibo');
    }

    async function gerarRecibo() {
      const numero  = document.getElementById('numero-recibo').value;
      const cliente = document.getElementById('nome-cliente-recibo').value.trim();
      const valor   = document.getElementById('valor-recibo').value;

      if (!numero || !cliente || !valor) { mostrarErro('recibo', 'Preencha todos os campos!'); return; }

      esconderMensagens('recibo');
      document.getElementById('btn-gerar-recibo').disabled = true;
      document.getElementById('carregando-recibo').style.display = 'block';

      try {
        const resposta = await fetch(`${API_URL}/receipts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({
            receiptNumber: parseInt(numero),
            clientName:    cliente,
            value:         parseFloat(parseFloat(valor.replace(',', '.')).toFixed(2)),
            emitterId:     emitterIdSelecionado
          })
        });
        if (!resposta.ok) throw new Error('Erro ao gerar o recibo. Tente novamente.');
        baixarBlob(await resposta.blob(), `recibo-${numero}-${cliente}.pdf`);
        document.getElementById('msg-sucesso-recibo').style.display = 'block';
      } catch (erro) {
        mostrarErro('recibo', erro.message);
      } finally {
        document.getElementById('btn-gerar-recibo').disabled = false;
        document.getElementById('carregando-recibo').style.display = 'none';
      }
    }

    // ============================================================
    // ORÇAMENTO — itens dinâmicos
    // ============================================================
    function adicionarItem() {
      const id    = ++contadorItens;
      const lista = document.getElementById('lista-itens');
      const el    = document.createElement('div');
      el.className = 'item-card';
      el.id = `item-${id}`;
      el.innerHTML = `
        <div class="item-card-header">
          <input type="text" placeholder="Descrição do serviço" class="item-descricao" />
          <button class="btn-remover" onclick="removerItem(${id})">✕</button>
        </div>
        <div class="item-card-valores">
          <div class="item-campo-mini">
            <label>Valor (R$)</label>
            <input type="number" class="item-valor" placeholder="0,00" step="0.01" min="0"
              oninput="atualizarSubtotalItem(${id}); atualizarTotais()" />
          </div>
          <div class="item-campo-mini">
            <label>Qtd</label>
            <input type="number" class="item-quantidade" value="1" step="0.1" min="0.1"
              oninput="atualizarSubtotalItem(${id}); atualizarTotais()" />
          </div>
          <div class="item-campo-mini">
            <label>Unidade</label>
            <input type="text" class="item-unidade" value="un" />
          </div>
        </div>
        <div class="item-subtotal" id="subtotal-item-${id}">Subtotal: R$ 0,00</div>
      `;
      lista.appendChild(el);
    }

    function removerItem(id) {
      const el = document.getElementById(`item-${id}`);
      if (el) el.remove();
      atualizarTotais();
    }

    // atualiza o mini-subtotal de um item específico (valor × quantidade)
    function atualizarSubtotalItem(id) {
      const card = document.getElementById(`item-${id}`);
      if (!card) return;
      const valor = parseFloat(card.querySelector('.item-valor').value)     || 0;
      const qtd   = parseFloat(card.querySelector('.item-quantidade').value) || 1;
      card.querySelector(`#subtotal-item-${id}`).textContent = `Subtotal: ${formatarReais(valor * qtd)}`;
    }

    // recalcula o resumo geral (subtotal, desconto, total)
    function atualizarTotais() {
      let subtotal = 0;
      document.querySelectorAll('#lista-itens .item-card').forEach(function (card) {
        const valor = parseFloat(card.querySelector('.item-valor').value)     || 0;
        const qtd   = parseFloat(card.querySelector('.item-quantidade').value) || 1;
        subtotal += valor * qtd;
      });
      const desconto      = parseFloat(document.getElementById('desconto').value) || 0;
      const descontoValor = subtotal * (desconto / 100);
      const total         = subtotal - descontoValor;

      document.getElementById('resumo-subtotal').textContent    = formatarReais(subtotal);
      document.getElementById('resumo-total-valor').textContent = formatarReais(total);

      const linhaDesconto = document.getElementById('resumo-desconto-linha');
      if (desconto > 0) {
        document.getElementById('resumo-desconto').textContent = `- ${formatarReais(descontoValor)}`;
        linhaDesconto.style.display = 'flex';
      } else {
        linhaDesconto.style.display = 'none';
      }
    }

    // ============================================================
    // ORÇAMENTO — gerar PDF via API
    // ============================================================
    async function gerarOrcamento() {
      const numero  = document.getElementById('numero-orcamento').value;
      const cliente = document.getElementById('nome-cliente-orcamento').value.trim();

      if (!numero || !cliente) { mostrarErro('orcamento', 'Preencha o número e o nome do cliente!'); return; }

      // coleta e valida os itens
      const itens = [];
      for (const card of document.querySelectorAll('#lista-itens .item-card')) {
        const desc    = card.querySelector('.item-descricao').value.trim();
        const valor   = parseFloat(card.querySelector('.item-valor').value);
        const qtd     = parseFloat(card.querySelector('.item-quantidade').value) || 1;
        const unidade = card.querySelector('.item-unidade').value.trim() || 'un';
        if (!desc || !valor) { mostrarErro('orcamento', 'Preencha a descrição e o valor de todos os itens!'); return; }
        itens.push({ description: desc, value: valor, quantity: qtd, unit: unidade });
      }
      if (itens.length === 0) { mostrarErro('orcamento', 'Adicione pelo menos um item ao orçamento!'); return; }

      esconderMensagens('orcamento');
      document.getElementById('btn-gerar-orcamento').disabled = true;
      document.getElementById('carregando-orcamento').style.display = 'block';

      // campos opcionais só entram no body se preenchidos
      const body = { emitterId: emitterIdSelecionado, quoteNumber: parseInt(numero), clientName: cliente, items: itens };
      const descontoPct = document.getElementById('desconto').value;
      const condicao    = document.getElementById('condicao-pagamento').value.trim();
      const formas      = document.getElementById('formas-pagamento').value.trim();
      const mensagem    = document.getElementById('mensagem-orcamento').value.trim();
      if (descontoPct) body.discountPercent   = parseFloat(descontoPct);
      if (condicao)    body.paymentConditions = condicao;
      if (formas)      body.paymentMethods    = formas;
      if (mensagem)    body.message           = mensagem;

      try {
        const resposta = await fetch(`${API_URL}/quotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify(body)
        });
        if (!resposta.ok) throw new Error('Erro ao gerar o orçamento. Tente novamente.');
        baixarBlob(await resposta.blob(), `orcamento-${numero}-${cliente}.pdf`);
        document.getElementById('msg-sucesso-orcamento').style.display = 'block';
      } catch (erro) {
        mostrarErro('orcamento', erro.message);
      } finally {
        document.getElementById('btn-gerar-orcamento').disabled = false;
        document.getElementById('carregando-orcamento').style.display = 'none';
      }
    }

    // ============================================================
    // UTILITÁRIOS
    // ============================================================
    function baixarBlob(blob, nomeArquivo) {
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = nomeArquivo; link.click();
      window.URL.revokeObjectURL(url);
    }

    function formatarReais(valor) {
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function esconderMensagens(tipo) {
      document.getElementById(`msg-sucesso-${tipo}`).style.display = 'none';
      document.getElementById(`msg-erro-${tipo}`).style.display    = 'none';
      document.getElementById(`carregando-${tipo}`).style.display  = 'none';
    }

    function mostrarErro(tipo, mensagem) {
      document.getElementById(`texto-erro-${tipo}`).textContent = mensagem;
      document.getElementById(`msg-erro-${tipo}`).style.display = 'block';
    }
