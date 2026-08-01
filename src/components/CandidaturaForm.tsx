import React, { useState, useEffect, useMemo } from "react";
import { 
  User, 
  Instagram, 
  Phone, 
  Briefcase, 
  CheckCircle2, 
  ChevronLeft, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  HelpCircle,
  Link as LinkIcon,
  Check,
  ShieldCheck,
  Zap,
  Lock,
  Copy,
  ExternalLink,
  Layers,
  FileText,
  DollarSign,
  Clock,
  RotateCcw
} from "lucide-react";

import { 
  CandidateAnswers, 
  CandidateSubmission, 
  RoleCategory, 
  TrackId, 
  Question 
} from "../types/form";
import { TRACKS } from "../data/formSchema";
import { 
  maskPhone, 
  parseUrlPreselection, 
  getTestWordForTrack, 
  reverseString, 
  evaluateCandidateTags, 
  saveCandidateLocally, 
  sendSubmissionWebhook, 
  saveFormDraft, 
  getFormDraft, 
  clearFormDraft 
} from "../utils/formHelpers";
import { LiquidMetalButton } from "./ui/liquid-metal-button";

interface CandidaturaFormProps {
  onOpenRecruiterDashboard?: () => void;
}

export default function CandidaturaForm({ onOpenRecruiterDashboard }: CandidaturaFormProps) {
  // Current screen step (1 to 5)
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [lastSubmission, setLastSubmission] = useState<CandidateSubmission | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [answers, setAnswers] = useState<CandidateAnswers>({
    nome: "",
    instagram: "",
    whatsapp: "",
    vaga: "",
    copywriterTipo: undefined,
    editorTipo: undefined,
    copywriterMaisForte: undefined,
    editorMaisForte: undefined,
    trafegoNivel: undefined,
    trilhaId: "",
    trackAnswers: {},
    fullTimeExclusivo: "",
    trabalhandoAtualmente: "",
    tempoInicio: "",
    motivoSaida: "",
    flexibilidadeHorarios: "",
    comentarioFinaisDeSemana: "",
    escalouSeisDigitos: "",
    detalheSeisDigitos: "",
    pretensaoSalarial: "",
    comoConheceu: "",
    testeAtencaoResposta: "",
    destaqueImportante: "",
    idade: "",
    temCnpj: "",
    autorizaLgpd: false,
  });

  // Load URL Preselection or Saved Draft on Mount
  useEffect(() => {
    const urlPre = parseUrlPreselection();
    const draft = getFormDraft();

    if (urlPre.vaga) {
      setAnswers((prev) => ({
        ...prev,
        vaga: urlPre.vaga!,
        copywriterTipo: urlPre.copywriterTipo,
        editorTipo: urlPre.editorTipo,
        trafegoNivel: urlPre.trafegoNivel,
        trilhaId: urlPre.trilhaId || "",
      }));
      // If URL preselected complete track, can start at step 1 or step 2
    } else if (draft && draft.answers && draft.answers.nome) {
      setAnswers(draft.answers);
      setStep(draft.step || 1);
    }
  }, []);

  // Save Draft whenever state updates
  useEffect(() => {
    if (!submitted && answers.nome) {
      saveFormDraft({ step, answers });
    }
  }, [step, answers, submitted]);

  // Derived Active Track Config
  const activeTrack = useMemo(() => {
    if (answers.trilhaId && answers.trilhaId in TRACKS) {
      return TRACKS[answers.trilhaId as TrackId];
    }
    return null;
  }, [answers.trilhaId]);

  // Dynamic Routing Resolver
  const resolveRouting = (vaga: RoleCategory, subChoice?: string) => {
    let chosenTrackId: TrackId | "" = "";

    if (vaga === "Copywriter") {
      const type = subChoice || answers.copywriterTipo;
      if (type === "Criativos") chosenTrackId = "T1";
      else if (type === "VSL") chosenTrackId = "T2";
    } else if (vaga === "Editor de vídeo") {
      const type = subChoice || answers.editorTipo;
      if (type === "Criativos") chosenTrackId = "T3";
      else if (type === "VSL") chosenTrackId = "T4";
    } else if (vaga === "Gestor de tráfego") {
      const nivel = subChoice || answers.trafegoNivel;
      if (nivel === "Junior") chosenTrackId = "T5";
      else if (nivel === "Senior") chosenTrackId = "T6";
    } else if (vaga === "Gestor de projetos") {
      chosenTrackId = "T7";
    }

    return { chosenTrackId };
  };

  // Field change handlers
  const updateAnswer = (key: keyof CandidateAnswers, value: any) => {
    setValidationError(null);
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const updateTrackAnswer = (questionId: string, value: string | string[]) => {
    setValidationError(null);
    setAnswers((prev) => ({
      ...prev,
      trackAnswers: {
        ...prev.trackAnswers,
        [questionId]: value,
      },
    }));
  };

  // Toggle multi-select question items
  const toggleMultiSelectOption = (questionId: string, optionLabel: string) => {
    setValidationError(null);
    const current = (answers.trackAnswers[questionId] as string[]) || [];
    let updated: string[];

    if (current.includes(optionLabel)) {
      updated = current.filter((item) => item !== optionLabel);
    } else {
      updated = [...current, optionLabel];
    }
    updateTrackAnswer(questionId, updated);
  };

  // Validation Check per Step
  const validateCurrentStep = (): boolean => {
    setValidationError(null);

    // Screen 1: Bloco 0 (Abertura)
    if (step === 1) {
      if (!answers.nome.trim()) {
        setValidationError("Por favor, informe seu nome completo.");
        return false;
      }
      if (!answers.instagram.trim()) {
        setValidationError("Por favor, informe o @ do seu Instagram.");
        return false;
      }
      if (!answers.whatsapp.trim() || answers.whatsapp.replace(/\D/g, "").length < 10) {
        setValidationError("Por favor, informe um número de WhatsApp válido com DDD.");
        return false;
      }
      return true;
    }

    // Screen 2: Bloco 1 (Roteamento)
    if (step === 2) {
      if (!answers.vaga) {
        setValidationError("Selecione a vaga para a qual deseja se candidatar.");
        return false;
      }

      if (answers.vaga === "Copywriter" && !answers.copywriterTipo) {
        setValidationError("Selecione se seu foco principal é Criativos ou VSL.");
        return false;
      }

      if (answers.vaga === "Editor de vídeo" && !answers.editorTipo) {
        setValidationError("Selecione se seu foco principal é Criativos ou VSL.");
        return false;
      }

      if (answers.vaga === "Gestor de tráfego" && !answers.trafegoNivel) {
        setValidationError("Selecione a sua experiência com gestão de verba em tráfego.");
        return false;
      }

      if (!answers.trilhaId) {
        setValidationError("Erro ao direcionar para a trilha. Escolha as opções da vaga novamente.");
        return false;
      }

      return true;
    }

    // Screen 3: Bloco 2 (Trilha Específica)
    if (step === 3) {
      if (!activeTrack) {
        setValidationError("Trilha não identificada. Volte à etapa anterior.");
        return false;
      }

      for (const q of activeTrack.questions) {
        if (q.required) {
          const val = answers.trackAnswers[q.id];
          if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === "string" && !val.trim())) {
            setValidationError(`Por favor, responda à pergunta: "${q.label}"`);
            return false;
          }
        }

        // Validate conditional sub-question if active
        if (q.conditionalSubQuestion) {
          const mainVal = answers.trackAnswers[q.id];
          if (mainVal === q.conditionalSubQuestion.triggerValue) {
            const subVal = answers.trackAnswers[q.conditionalSubQuestion.id];
            if (!subVal || (typeof subVal === "string" && !subVal.trim())) {
              setValidationError(`Por favor, responda ao detalhe: "${q.conditionalSubQuestion.label}"`);
              return false;
            }
          }
        }
      }

      return true;
    }

    // Screen 4: Bloco 3 (Disponibilidade e Dinheiro)
    if (step === 4) {
      if (!answers.fullTimeExclusivo) {
        setValidationError("Informe se possui disponibilidade para atuar FULL TIME e exclusivo.");
        return false;
      }
      if (!answers.trabalhandoAtualmente) {
        setValidationError("Informe se está trabalhando atualmente.");
        return false;
      }
      if (!answers.tempoInicio) {
        setValidationError("Informe em quanto tempo consegue iniciar.");
        return false;
      }
      if (!answers.motivoSaida.trim()) {
        setValidationError("Informe o motivo pelo qual deixou seu último trabalho ou pretende deixar o atual.");
        return false;
      }
      if (!answers.flexibilidadeHorarios) {
        setValidationError("Informe sobre sua flexibilidade de horários.");
        return false;
      }

      // 6 digits check required unless on T6 where already asked in T6.3
      if (answers.trilhaId !== "T6") {
        if (!answers.escalouSeisDigitos) {
          setValidationError("Informe se já fez parte de algum projeto que escalou múltiplos 6 dígitos.");
          return false;
        }
        if (answers.escalouSeisDigitos === "Sim" && !answers.detalheSeisDigitos?.trim()) {
          setValidationError("Detalia o projeto, nicho e seu papel na escala de 6 dígitos.");
          return false;
        }
      }

      // Salary expectation required unless on T5 where fixed 2k is already set
      if (answers.trilhaId !== "T5" && !answers.pretensaoSalarial?.trim()) {
        setValidationError("Informe a sua pretensão salarial.");
        return false;
      }

      return true;
    }

    // Screen 5: Bloco 4 (Fechamento)
    if (step === 5) {
      if (!answers.comoConheceu) {
        setValidationError("Informe como você conheceu essa vaga.");
        return false;
      }
      if (!answers.testeAtencaoResposta.trim()) {
        setValidationError("Responda ao teste de atenção.");
        return false;
      }
      if (!answers.idade || Number(answers.idade) <= 0) {
        setValidationError("Informe a sua idade em números.");
        return false;
      }
      if (!answers.temCnpj) {
        setValidationError("Informe se possui CNPJ.");
        return false;
      }
      if (!answers.autorizaLgpd) {
        setValidationError("Você precisa autorizar o armazenamento dos dados para fins de recrutamento.");
        return false;
      }

      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (step < 5) {
        setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      handleNext();
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);

    const activeTrackId = (answers.trilhaId || "T1") as TrackId;

    // Compute tags and submission payload
    const tags = evaluateCandidateTags(answers, activeTrackId);
    const submissionId = `DOM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const submission: CandidateSubmission = {
      id: submissionId,
      timestamp: new Date().toISOString(),
      dataFormatted: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      trackId: activeTrackId,
      vaga: answers.vaga,
      especialidade: TRACKS[activeTrackId]?.title || answers.vaga,
      coberturaDupla: false,
      tags,
      answers,
    };

    // Save locally
    saveCandidateLocally(submission);
    setLastSubmission(submission);

    // Trigger Webhook in background
    await sendSubmissionWebhook(submission);

    clearFormDraft();
    setIsSubmitting(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetForm = () => {
    clearFormDraft();
    setSubmitted(false);
    setStep(1);
    setLastSubmission(null);
    setAnswers({
      nome: "",
      instagram: "",
      whatsapp: "",
      vaga: "",
      copywriterTipo: undefined,
      editorTipo: undefined,
      copywriterMaisForte: undefined,
      editorMaisForte: undefined,
      trafegoNivel: undefined,
      trilhaId: "",
      trackAnswers: {},
      fullTimeExclusivo: "",
      trabalhandoAtualmente: "",
      tempoInicio: "",
      motivoSaida: "",
      flexibilidadeHorarios: "",
      comentarioFinaisDeSemana: "",
      escalouSeisDigitos: "",
      detalheSeisDigitos: "",
      pretensaoSalarial: "",
      comoConheceu: "",
      testeAtencaoResposta: "",
      destaqueImportante: "",
      idade: "",
      temCnpj: "",
      autorizaLgpd: false,
    });
  };

  // Helper for rendering track questions
  const renderQuestionInput = (q: Question) => {
    const value = answers.trackAnswers[q.id];

    if (q.type === "unica" && q.options) {
      return (
        <div className="space-y-2.5">
          {(q.options as string[]).map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => updateTrackAnswer(q.id, opt)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                  isSelected
                    ? "bg-[#181922] border-[#41F20A] text-white shadow-[0_0_20px_rgba(65,242,10,0.18)]"
                    : "bg-[#121319] border-zinc-800/80 text-zinc-300 hover:bg-[#171822] hover:border-zinc-700"
                }`}
              >
                <span className="text-sm font-medium pr-3 leading-snug">{opt}</span>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? "bg-[#41F20A] border-[#41F20A] text-black shadow-[0_0_10px_rgba(65,242,10,0.6)]"
                      : "border-zinc-700 bg-zinc-950/80"
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === "multipla" && q.options) {
      const selectedList = (value as string[]) || [];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(q.options as string[]).map((opt) => {
            const isChecked = selectedList.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleMultiSelectOption(q.id, opt)}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                  isChecked
                    ? "bg-[#181922] border-[#41F20A] text-white shadow-[0_0_16px_rgba(65,242,10,0.15)]"
                    : "bg-[#121319] border-zinc-800/80 text-zinc-400 hover:bg-[#171822] hover:text-zinc-200"
                }`}
              >
                <span className="text-xs sm:text-sm font-medium pr-2">{opt}</span>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? "bg-[#41F20A] border-[#41F20A] text-black"
                      : "border-zinc-700 bg-zinc-950/80"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === "longo") {
      return (
        <textarea
          rows={3}
          value={(value as string) || ""}
          onChange={(e) => updateTrackAnswer(q.id, e.target.value)}
          placeholder={q.placeholder || "Sua resposta detalhada..."}
          className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#41F20A] transition resize-y leading-relaxed"
        />
      );
    }

    if (q.type === "link") {
      return (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <LinkIcon size={16} />
          </div>
          <input
            type="url"
            value={(value as string) || ""}
            onChange={(e) => updateTrackAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || "https://drive.google.com/..."}
            className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#41F20A] transition"
          />
        </div>
      );
    }

    return (
      <input
        type="text"
        value={(value as string) || ""}
        onChange={(e) => updateTrackAnswer(q.id, e.target.value)}
        placeholder={q.placeholder || "Sua resposta..."}
        className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#41F20A] transition"
      />
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6 px-3 sm:px-6 relative z-10">
      
      {/* Container Glass Box */}
      <div className="relative bg-[#08090d]/85 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 md:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col justify-between overflow-hidden">
        
        {/* Top Gloss Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#41F20A]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar with Step Navigation, Title & Recruiter HR Button */}
        {!submitted && (
          <div className="space-y-6 pb-6 border-b border-zinc-800/80">
            <div className="flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-10 h-10 rounded-full bg-[#121319] border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition hover:bg-zinc-800 focus:outline-none shrink-0"
                  aria-label="Voltar etapa"
                >
                  <ChevronLeft size={20} />
                </button>
              ) : (
                <div className="w-10 h-10" />
              )}

              {/* Progress Indicator */}
              <div className="flex items-center gap-2 flex-1 max-w-[200px] mx-auto justify-center">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                  Etapa {step} de 5
                </span>
                <div className="flex items-center gap-1.5 flex-1">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const currentIdx = idx + 1;
                    const isCompleted = currentIdx < step;
                    const isActive = currentIdx === step;
                    return (
                      <div
                        key={idx}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          isActive
                            ? "bg-[#41F20A] shadow-[0_0_12px_rgba(65,242,10,0.6)]"
                            : isCompleted
                            ? "bg-[#41F20A]/60"
                            : "bg-zinc-800"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="w-10 h-10" />
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle size={18} className="shrink-0 text-red-400" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN CONTENT SWITCHING (STEPS 1 to 5 + SUBMITTED STATE)
           ========================================================================= */}

        {submitted && lastSubmission ? (
          /* =========================================================================
             SUCESSO - CANDIDATURA ENVIADA
             ========================================================================= */
          <div className="py-10 text-center space-y-8 my-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-[#41F20A]/10 border border-[#41F20A]/40 flex items-center justify-center text-[#41F20A] mx-auto shadow-[0_0_40px_rgba(65,242,10,0.35)]">
              <CheckCircle2 size={46} />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-[#41F20A]">
                <span>CÓDIGO: {lastSubmission.id}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-white">
                Candidatura Enviada com Sucesso!
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 font-sans max-w-md mx-auto leading-relaxed">
                Obrigado, <strong className="text-white">{lastSubmission.answers.nome}</strong>. Seus dados foram cadastrados em nosso banco de talentos e o nosso time de operações/RH avaliará seu perfil para a vaga de <strong className="text-[#41F20A]">{lastSubmission.especialidade}</strong>.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 text-left max-w-lg mx-auto space-y-3 text-xs sm:text-sm text-zinc-300">
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500 font-mono uppercase">Vaga:</span>
                <span className="font-semibold text-white">{lastSubmission.vaga}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500 font-mono uppercase">Trilha:</span>
                <span className="font-semibold text-[#41F20A]">{lastSubmission.especialidade} ({lastSubmission.trackId})</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500 font-mono uppercase">WhatsApp:</span>
                <span className="font-mono text-white">{lastSubmission.answers.whatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono uppercase">Data do Envio:</span>
                <span className="font-mono text-zinc-400">{lastSubmission.dataFormatted}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <LiquidMetalButton
                label="NOVA CANDIDATURA"
                icon={<RotateCcw size={14} className="text-[#41F20A]" />}
                onClick={handleResetForm}
                width={220}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="pt-6 space-y-8">
            
            {/* =========================================================================
                SCREEN 1: ETAPA 1 — INFORMAÇÕES PESSOAIS
               ========================================================================= */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-[#41F20A] uppercase tracking-wider font-semibold block">
                    ETAPA 1 - INFORMAÇÕES PESSOAIS
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                    Informe seus dados iniciais de contato
                  </h1>
                </div>

                <div className="space-y-4 pt-2">
                  {/* 1. Nome Completo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-[#41F20A]" />
                      1. Nome completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={answers.nome}
                      onChange={(e) => updateAnswer("nome", e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#41F20A] transition"
                    />
                  </div>

                  {/* 2. Instagram */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Instagram size={14} className="text-[#41F20A]" />
                      2. Qual o @ do seu Instagram? *
                    </label>
                    <input
                      type="text"
                      required
                      value={answers.instagram}
                      onChange={(e) => updateAnswer("instagram", e.target.value)}
                      placeholder="@seu.perfil"
                      className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#41F20A] transition"
                    />
                  </div>

                  {/* 3. WhatsApp com máscara */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={14} className="text-[#41F20A]" />
                      3. WhatsApp (com DDD) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={answers.whatsapp}
                      onChange={(e) => updateAnswer("whatsapp", maskPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-2xl px-4 py-3.5 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#41F20A] transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 2: ETAPA 2 — VAGA
               ========================================================================= */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-[#41F20A] uppercase tracking-wider font-semibold block">
                    ETAPA 2 • VAGA
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                    Para qual vaga você quer se candidatar?
                  </h2>
                </div>

                {/* 1.1 Vagas Principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(["Copywriter", "Editor de vídeo", "Gestor de tráfego", "Gestor de projetos"] as RoleCategory[]).map((vaga) => {
                    const isSelected = answers.vaga === vaga;
                    return (
                      <button
                        key={vaga}
                        type="button"
                        onClick={() => {
                          updateAnswer("vaga", vaga);
                          // Auto resolve initial default track
                          const { chosenTrackId } = resolveRouting(vaga);
                          updateAnswer("trilhaId", chosenTrackId);
                        }}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                          isSelected
                            ? "bg-[#181922] border-[#41F20A] text-white shadow-[0_0_20px_rgba(65,242,10,0.2)]"
                            : "bg-[#121319] border-zinc-800/80 text-zinc-300 hover:bg-[#171822] hover:border-zinc-700"
                        }`}
                      >
                        <span className="text-sm font-bold font-heading">{vaga}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-[#41F20A] border-[#41F20A] text-black shadow-[0_0_10px_rgba(65,242,10,0.6)]"
                              : "border-zinc-700 bg-zinc-950/80"
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 1.2 CONDICIONAL: Copywriter */}
                {answers.vaga === "Copywriter" && (
                  <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3 animate-in fade-in">
                    <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider block">
                      Qual é o seu foco principal? *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(["Criativos", "VSL"] as const).map((tipo) => {
                        const isSelected = answers.copywriterTipo === tipo;
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => {
                              updateAnswer("copywriterTipo", tipo);
                              const { chosenTrackId } = resolveRouting("Copywriter", tipo);
                              updateAnswer("trilhaId", chosenTrackId);
                            }}
                            className={`p-3.5 rounded-xl border text-center text-xs font-bold transition ${
                              isSelected
                                ? "bg-[#41F20A]/10 border-[#41F20A] text-[#41F20A]"
                                : "bg-[#121319] border-zinc-800 text-zinc-300 hover:text-white"
                            }`}
                          >
                            {tipo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1.3 CONDICIONAL: Editor de vídeo */}
                {answers.vaga === "Editor de vídeo" && (
                  <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3 animate-in fade-in">
                    <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider block">
                      Qual é o seu foco principal? *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(["Criativos", "VSL"] as const).map((tipo) => {
                        const isSelected = answers.editorTipo === tipo;
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => {
                              updateAnswer("editorTipo", tipo);
                              const { chosenTrackId } = resolveRouting("Editor de vídeo", tipo);
                              updateAnswer("trilhaId", chosenTrackId);
                            }}
                            className={`p-3.5 rounded-xl border text-center text-xs font-bold transition ${
                              isSelected
                                ? "bg-[#41F20A]/10 border-[#41F20A] text-[#41F20A]"
                                : "bg-[#121319] border-zinc-800 text-zinc-300 hover:text-white"
                            }`}
                          >
                            {tipo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1.4 CONDICIONAL: Gestor de tráfego */}
                {answers.vaga === "Gestor de tráfego" && (
                  <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-4 animate-in fade-in">
                    <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider block">
                      Qual é o seu nível de experiência atual? *
                    </label>
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateAnswer("trafegoNivel", "Junior");
                          updateAnswer("trilhaId", "T5");
                        }}
                        className={`w-full p-4 rounded-xl border text-left transition ${
                          answers.trafegoNivel === "Junior"
                            ? "bg-[#41F20A]/10 border-[#41F20A] text-[#41F20A]"
                            : "bg-[#121319] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <span className="font-bold block text-sm">Ainda não gerenciei verba sozinho</span>
                        <span className="text-xs text-zinc-400 font-sans">Quero aprender a operação, executar com suporte e evoluir no time</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateAnswer("trafegoNivel", "Senior");
                          updateAnswer("trilhaId", "T6");
                        }}
                        className={`w-full p-4 rounded-xl border text-left transition ${
                          answers.trafegoNivel === "Senior"
                            ? "bg-[#41F20A]/10 border-[#41F20A] text-[#41F20A]"
                            : "bg-[#121319] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <span className="font-bold block text-sm">Já gerenciei verba sozinho com resultados</span>
                        <span className="text-xs text-zinc-400 font-sans">Tenho histórico comprovado de escala de campanhas</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                SCREEN 3: ETAPA 3 — TRILHA ESPECÍFICA
               ========================================================================= */}
            {step === 3 && activeTrack && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#41F20A]/10 border border-[#41F20A]/30 text-xs font-mono text-[#41F20A]">
                    <span>ETAPA 3 • {activeTrack.roleName.toUpperCase()}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                    {activeTrack.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                    Responda com atenção às perguntas referentes à sua área de atuação.
                  </p>
                </div>

                <div className="space-y-6">
                  {activeTrack.questions.map((q, idx) => {
                    const isConditionalActive =
                      q.conditionalSubQuestion &&
                      answers.trackAnswers[q.id] === q.conditionalSubQuestion.triggerValue;

                    return (
                      <div key={q.id} className="space-y-2 pt-2 border-b border-zinc-900 pb-5">
                        <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block leading-snug">
                          <span className="text-[#41F20A] font-bold mr-1.5">{idx + 1}.</span>
                          {q.label}
                          {q.required && <span className="text-amber-400 ml-1">*</span>}
                        </label>

                        {q.helpText && (
                          <p className="text-[11px] text-zinc-400 font-sans italic">
                            {q.helpText}
                          </p>
                        )}

                        <div className="pt-1">{renderQuestionInput(q)}</div>

                        {/* Render Conditional Sub-Question (e.g., 6a, 8a, 3a) */}
                        {isConditionalActive && q.conditionalSubQuestion && (
                          <div className="mt-3 p-4 rounded-2xl bg-[#12141d] border border-[#41F20A]/30 space-y-2 animate-in fade-in">
                            <label className="text-xs font-mono text-[#41F20A] font-semibold block">
                              • {q.conditionalSubQuestion.label} *
                            </label>
                            <textarea
                              rows={2}
                              value={(answers.trackAnswers[q.conditionalSubQuestion.id] as string) || ""}
                              onChange={(e) => updateTrackAnswer(q.conditionalSubQuestion!.id, e.target.value)}
                              placeholder={q.conditionalSubQuestion.placeholder || "Detalhe aqui..."}
                              className="w-full bg-[#08090d] border border-zinc-800 focus:border-[#41F20A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 4: ETAPA 4 — DISPONIBILIDADE E PRETENSÃO
               ========================================================================= */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-4">
                  <span className="text-[11px] font-mono text-[#41F20A] uppercase tracking-wider font-semibold block">
                    ETAPA 4 • DISPONIBILIDADE & PRETENSÃO
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                    Alinhamento de Condições e Rotina
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                    Análise de disponibilidade de tempo, rotina de trabalho e expectativas financeiras.
                  </p>
                </div>

                <div className="space-y-5">
                  
                  {/* 3.1 Full Time Exclusivo */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                      3.1 Tem disponibilidade para exercer sua função FULL TIME e de forma exclusiva? *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["Sim", "Não"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer("fullTimeExclusivo", opt)}
                          className={`p-3.5 rounded-xl border text-center text-xs font-bold transition ${
                            answers.fullTimeExclusivo === opt
                              ? "bg-[#41F20A]/15 border-[#41F20A] text-[#41F20A]"
                              : "bg-[#121319] border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3.2 Trabalhando Atualmente */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                      3.2 Você está trabalhando atualmente? *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["Sim", "Não"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer("trabalhandoAtualmente", opt)}
                          className={`p-3.5 rounded-xl border text-center text-xs font-bold transition ${
                            answers.trabalhandoAtualmente === opt
                              ? "bg-[#41F20A]/15 border-[#41F20A] text-[#41F20A]"
                              : "bg-[#121319] border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3.3 Tempo para Início */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                      3.3 Em quanto tempo você consegue começar? *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["Imediatamente", "Em até 15 dias", "Em até 30 dias", "Mais de 30 dias"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer("tempoInicio", opt)}
                          className={`p-3 rounded-xl border text-center text-[11px] font-semibold transition ${
                            answers.tempoInicio === opt
                              ? "bg-[#41F20A]/15 border-[#41F20A] text-[#41F20A]"
                              : "bg-[#121319] border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3.4 Motivo Saída */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                      3.4 Por qual motivo você deixou seu último trabalho, ou pretende deixar o atual? *
                    </label>
                    <textarea
                      rows={2}
                      value={answers.motivoSaida}
                      onChange={(e) => updateAnswer("motivoSaida", e.target.value)}
                      placeholder="Explique os motivos da mudança de projeto..."
                      className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                    />
                  </div>

                  {/* 3.5 Flexibilidade Horários */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                      3.5 Teria flexibilidade para atender demandas em qualquer horário do day, inclusive aos finais de semana? *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["Sim", "Não"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer("flexibilidadeHorarios", opt)}
                          className={`p-3.5 rounded-xl border text-center text-xs font-bold transition ${
                            answers.flexibilidadeHorarios === opt
                              ? "bg-[#41F20A]/15 border-[#41F20A] text-[#41F20A]"
                              : "bg-[#121319] border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3.6 Comentário Finais de Semana (Opcional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 font-medium block">
                      3.6 Quer comentar alguma coisa sobre finais de semana e feriados? (Opcional)
                    </label>
                    <input
                      type="text"
                      value={answers.comentarioFinaisDeSemana}
                      onChange={(e) => updateAnswer("comentarioFinaisDeSemana", e.target.value)}
                      placeholder="Ex: Disponível para plantões de emergência em escala..."
                      className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    />
                  </div>

                  {/* 3.7 Escalou 6 Digitos (OCULTAR na T6 pois já foi perguntado em T6.3) */}
                  {answers.trilhaId !== "T6" && (
                    <div className="space-y-2 pt-2 border-t border-zinc-900">
                      <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                        3.7 Você já fez parte de algum projeto que escalou múltiplos 6 dígitos? *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["Sim", "Não"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateAnswer("escalouSeisDigitos", opt)}
                            className={`p-3.5 rounded-xl border text-center text-xs font-bold transition ${
                              answers.escalouSeisDigitos === opt
                                ? "bg-[#41F20A]/15 border-[#41F20A] text-[#41F20A]"
                                : "bg-[#121319] border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {answers.escalouSeisDigitos === "Sim" && (
                        <div className="mt-2 p-3.5 rounded-xl bg-[#12141d] border border-[#41F20A]/30 space-y-1.5 animate-in fade-in">
                          <label className="text-xs font-mono text-[#41F20A] font-semibold block">
                            3.7a Qual projeto, qual nicho e qual era o seu papel nele? *
                          </label>
                          <textarea
                            rows={2}
                            value={answers.detalheSeisDigitos}
                            onChange={(e) => updateAnswer("detalheSeisDigitos", e.target.value)}
                            placeholder="Detalhamento do projeto e faturamento..."
                            className="w-full bg-[#08090d] border border-zinc-800 focus:border-[#41F20A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3.8 Pretensão Salarial (OCULTAR na T5 pois valor fixo 2k é pré-definido) */}
                  {answers.trilhaId !== "T5" ? (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                      <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign size={15} className="text-[#41F20A]" />
                        3.8 Qual sua pretensão salarial? *
                      </label>
                      <input
                        type="text"
                        required
                        value={answers.pretensaoSalarial}
                        onChange={(e) => updateAnswer("pretensaoSalarial", e.target.value)}
                        placeholder="R$"
                        className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#12141d] border border-zinc-800 text-xs text-zinc-400 font-sans flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#41F20A] shrink-0" />
                      <span>Para a vaga de Tráfego Júnior (T5), o valor fixo inicial é de R$ 2.000,00 mensal.</span>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 5: ETAPA 5 — DADOS FINAIS
               ========================================================================= */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-4">
                  <span className="text-[11px] font-mono text-[#41F20A] uppercase tracking-wider font-semibold block">
                    ETAPA 5 • DADOS FINAIS
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                    Confirmação Final da Candidatura
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                    Última etapa. Responda ao teste de atenção e envie sua candidatura.
                  </p>
                </div>

                <div className="space-y-5">
                  
                  {/* 4.1 Como Conheceu */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold block">
                      4.1 Como você conheceu essa vaga? *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(["Instagram", "Indicação", "Grupo/comunidade", "Anúncio", "Outro"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer("comoConheceu", opt)}
                          className={`p-3 rounded-xl border text-center text-xs font-semibold transition ${
                            answers.comoConheceu === opt
                              ? "bg-[#41F20A]/15 border-[#41F20A] text-[#41F20A]"
                              : "bg-[#121319] border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4.2 TESTE DE ATENÇÃO */}
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                      <Lock size={16} />
                      <span>4.2 TESTE DE ATENÇÃO OBRIGATÓRIO</span>
                    </div>
                    
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">
                      Para confirmar que você leu todo o formulário com atenção, escreva a palavra{" "}
                      <strong className="text-[#41F20A] font-mono text-sm px-1.5 py-0.5 rounded bg-black/60 border border-[#41F20A]/40">
                        [{getTestWordForTrack(answers.trilhaId as TrackId)}]
                      </strong>{" "}
                      ao contrário no campo abaixo:
                    </p>

                    <input
                      type="text"
                      required
                      value={answers.testeAtencaoResposta}
                      onChange={(e) => updateAnswer("testeAtencaoResposta", e.target.value)}
                      placeholder="Escreva a palavra ao contrário..."
                      className="w-full bg-[#08090d] border border-amber-500/50 focus:border-[#41F20A] rounded-xl px-4 py-3 text-sm font-mono text-[#41F20A] placeholder-zinc-600 focus:outline-none uppercase"
                    />
                  </div>

                  {/* 4.3 Destaque Opcional */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 font-medium block">
                      4.3 Existe algo que não perguntamos e você acha importante destacar? (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={answers.destaqueImportante}
                      onChange={(e) => updateAnswer("destaqueImportante", e.target.value)}
                      placeholder="Sua observação final..."
                      className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    />
                  </div>

                  {/* 4.4 Idade e 4.5 CNPJ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider block">
                        4.4 Quantos anos você tem? *
                      </label>
                      <input
                        type="number"
                        min={14}
                        max={90}
                        required
                        value={answers.idade}
                        onChange={(e) => updateAnswer("idade", e.target.value ? Number(e.target.value) : "")}
                        placeholder="Ex: 25"
                        className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider block">
                        4.5 Tem CNPJ? *
                      </label>
                      <select
                        value={answers.temCnpj}
                        onChange={(e) => updateAnswer("temCnpj", e.target.value)}
                        className="w-full bg-[#121319] border border-zinc-800/90 focus:border-[#41F20A] rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="">Selecione...</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                        <option value="Estou em processo de abertura">Estou em processo de abertura</option>
                      </select>
                    </div>
                  </div>

                  {/* Autorização LGPD */}
                  <div className="pt-4 border-t border-zinc-800/80">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={answers.autorizaLgpd}
                        onChange={(e) => updateAnswer("autorizaLgpd", e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-[#41F20A] focus:ring-[#41F20A] w-4 h-4"
                      />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition leading-relaxed">
                        Autorizo o armazenamento dos meus dados pessoais e profissional para fins exclusivos de recrutamento e triagem na DOMINUS.
                      </span>
                    </label>
                  </div>

                </div>
              </div>
            )}

            {/* Bottom Navigation CTA Bar */}
            <div className="pt-8 mt-8 border-t border-zinc-900 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <ChevronLeft size={16} />
                  <span>Anterior</span>
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <LiquidMetalButton
                  label="PRÓXIMA ETAPA"
                  icon={<ArrowRight size={14} className="text-[#41F20A]" />}
                  onClick={handleNext}
                  width={220}
                />
              ) : (
                <LiquidMetalButton
                  label={isSubmitting ? "ENVIANDO CANDIDATURA..." : "FINALIZAR E ENVIAR"}
                  icon={
                    isSubmitting ? (
                      <Loader2 size={14} className="text-[#41F20A] animate-spin" />
                    ) : (
                      <ShieldCheck size={15} className="text-[#41F20A]" />
                    )
                  }
                  onClick={handleSubmit}
                  width={260}
                />
              )}
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
