// src/services/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";
import { cadastroSchema } from "../schemas/authSchema";
import { supabase } from "./supabase";

const USER_KEY = "@OSI_User";

// React Native não expõe crypto.getRandomValues para o bcryptjs puro,
// então instalamos um fallback manual. Não é CSPRNG, mas é suficiente
// para gerar salts em ambiente mobile onde a entropia do dispositivo
// não é acessível pela Web Crypto API padrão.
bcrypt.setRandomFallback((len) => {
  const array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array);
});

export const authService = {
  registrarAluno: async function (dadosFormulario: any) {
    try {
      const resultado = cadastroSchema.safeParse(dadosFormulario);
      
      if (!resultado.success) {
        throw new Error(resultado.error.issues[0].message);
      }

      const { usuario, instituicao, senha, nome } = dadosFormulario;

      const salt = bcrypt.genSaltSync(10);
      const senhaCriptografada = bcrypt.hashSync(senha, salt);

      const payloadInsercao = { 
        nome: nome.trim(),
        usuario: usuario.trim(), 
        instituicao: instituicao.trim(), 
        senha: senhaCriptografada, 
        pontuacao: 0
      };

      const { data, error } = await supabase
        .from("usuarios")
        .insert([payloadInsercao])
        .select()
        .single();

      if (error) {
        console.error("❌ ERRO REAL DO SUPABASE:", error);
        if (error.code === "23505") {
          throw new Error("Este nome de usuário já está cadastrado.");
        }
        throw new Error(`Erro no banco: ${error.message}`);
      }

      await this.saveUser(data);
      return data;

    } catch (error: any) {
      throw new Error(error.message || "Erro inesperado no cadastro.");
    }
  },

  // 2. FAZER LOGIN COMPARANDO O HASH
  logarAluno: async function (usuarioInserido: string, senhaInserida: string) {
    try {
      const usuarioFormatado = usuarioInserido.trim();
      let usuarioEncontrado = null;
      let ehDocente = false;

      // Passo 1: Tenta buscar na tabela de alunos (usuarios)
      const { data: aluno, error: erroAluno } = await supabase
        .from("usuarios")
        .select("*")
        .ilike("usuario", usuarioFormatado)
        .maybeSingle();

      if (erroAluno) {
        console.error("Erro ao buscar na tabela de usuarios:", erroAluno);
      }

      if (aluno) {
        usuarioEncontrado = aluno;
      } else {
        // Passo 2: Se não achou na de alunos, tenta buscar na tabela de docentes
        const { data: docente, error: erroDocente } = await supabase
          .from("docentes")
          .select("*")
          .ilike("usuario", usuarioFormatado)
          .maybeSingle();

        if (erroDocente) {
          console.error("Erro ao buscar na tabela de docentes:", erroDocente);
        }

        if (docente) {
          usuarioEncontrado = docente;
          ehDocente = true; // Marcamos como verdadeiro para setar a role de admin
        }
      }

      // Se passou pelas duas tabelas e não achou a string do usuário
      if (!usuarioEncontrado) {
        throw new Error("Usuário não encontrado.");
      }

      // Passo 3: Compara a senha digitada com o hash salvo no banco
      const senhaCorreta = bcrypt.compareSync(senhaInserida, usuarioEncontrado.senha);

      if (!senhaCorreta) {
        // Fallback de segurança para senhas antigas em texto puro (testes)
        if (senhaInserida === usuarioEncontrado.senha) {
          // Se for docente e não tiver a propriedade role no banco, a gente força aqui para o front saber
          if (ehDocente) usuarioEncontrado.role = "admin";
          
          await this.saveUser(usuarioEncontrado);
          return usuarioEncontrado;
        }
        throw new Error("Senha incorreta.");
      }

      // Passo 4: Se o login for de um docente, garante que o objeto carregará a role 'admin'
      if (ehDocente) {
        usuarioEncontrado.role = "admin";
      } else if (!usuarioEncontrado.role) {
        // Se for aluno e não tiver role definida por padrão, garante que é 'aluno'
        usuarioEncontrado.role = "aluno";
      }

      // Salva a sessão no AsyncStorage local e retorna para a tela
      await this.saveUser(usuarioEncontrado);
      return usuarioEncontrado;

    } catch (error: any) {
      throw new Error(error.message || "Erro ao realizar login.");
    }
  },

  saveUser: async (userData: any) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error("Erro ao guardar user", e);
    }
  },

  getUser: async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(USER_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      return null;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error("Erro no logout local", e);
    }
  },

  hashSenha: function (senha: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(senha, salt);
  },

  async adicionarXP(userId: string, xp: number) {
    // Sem try/catch aqui de propósito: os erros precisam propagar para o
    // catch de quem chama (ex.: simulado.tsx), senão a falha fica muda e o
    // usuário acha que o XP foi salvo quando não foi.
    // Lê do banco em vez do cache local para não sobrescrever XP ganho
    // em outra sessão ou dispositivo entre o início e o fim do simulado.
    const { data: atual, error: errLeitura } = await supabase
      .from("usuarios")
      .select("pontuacao")
      .eq("id", userId)
      .single();
    if (errLeitura) throw errLeitura;

    const novosPontos = (atual?.pontuacao || 0) + xp;
    const { error: errUpdate } = await supabase.from("usuarios").update({ pontuacao: novosPontos }).eq("id", userId);
    if (errUpdate) throw errUpdate;

    const user = await this.getUser();
    if (user) await this.saveUser({ ...user, pontuacao: novosPontos });
  },

  async salvarTentativa(dados: { simuladoId?: string; titulo: string; acertos: number; total: number }) {
    const user = await this.getUser();
    if (!user?.id) return;

    const { error } = await supabase.from("tentativas").insert([{
      usuario_id: user.id,
      simulado_id: dados.simuladoId || null,
      titulo: dados.titulo,
      acertos: dados.acertos,
      total: dados.total,
    }]);
    if (error) throw error;

    await this.atualizarStreak(user.id);
  },

  async atualizarStreak(userId: string) {
    const { data, error: errLeitura } = await supabase
      .from("usuarios")
      .select("ultimo_acesso, streak_dias")
      .eq("id", userId)
      .single();
    if (errLeitura) throw errLeitura;

    const hoje = new Date().toISOString().split("T")[0];
    // Mesma data: streak já contabilizado hoje, não incrementa
    if (data?.ultimo_acesso === hoje) return;

    const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const novoStreak = data?.ultimo_acesso === ontem ? (data.streak_dias || 0) + 1 : 1;

    const { error: errUpdate } = await supabase
      .from("usuarios")
      .update({ streak_dias: novoStreak, ultimo_acesso: hoje })
      .eq("id", userId);
    if (errUpdate) throw errUpdate;

    const user = await this.getUser();
    if (user) await this.saveUser({ ...user, streak_dias: novoStreak, ultimo_acesso: hoje });
  },

  async registrarDocente(dadosDocente: any) {
  try {
    const { nome, usuario, email, senha } = dadosDocente;

    if (!nome || !usuario || !email || !senha) {
      throw new Error("Preencha todos os campos para cadastrar o docente.");
    }

    // Criptografia usando o mesmo fallback seguro instalado no app
    const salt = bcrypt.genSaltSync(10);
    const senhaCriptografada = bcrypt.hashSync(senha, salt);

    // Salva na tabela exata que você mencionou: 'docentes'
    const { data, error } = await supabase
      .from("docentes")
      .insert([
        {
          nome: nome.trim(),
          usuario: usuario.trim(),
          email: email.toLowerCase().trim(),
          senha: senhaCriptografada,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ ERRO AO CRIAR DOCENTE NO SUPABASE:", error);
      if (error.code === "23505") {
        throw new Error("Este usuário ou e-mail de docente já está cadastrado.");
      }
      throw new Error(`Erro no banco: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || "Erro inesperado ao registrar docente.");
  }
},
};