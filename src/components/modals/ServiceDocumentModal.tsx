import React, { useState, useRef } from 'react';
import { ServiceRecord, Client, User } from '../../types';
import { X, FileText, Loader2, Download, MessageCircle, QrCode } from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface ServiceDocumentModalProps {
    service: ServiceRecord;
    client: Client;
    currentUser: User;
    onClose: () => void;
}

export const ServiceDocumentModal: React.FC<ServiceDocumentModalProps> = ({ service, client, currentUser, onClose }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const generatePDF = async (action: 'download' | 'share') => {
        if (!invoiceRef.current) return;
        setIsGeneratingPdf(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for render

            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

            const fileName = `Comprovante_${service.manualOrderId || 'servico'}.pdf`;

            if (action === 'download') {
                pdf.save(fileName);
                toast.success("PDF baixado com sucesso!");
            } else if (action === 'share') {
                setIsSharing(true);
                const pdfBlob = pdf.output('blob');
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Comprovante de Serviço',
                        text: `Olá ${client.name}, segue o comprovante do serviço #${service.manualOrderId || ''}.`
                    });

                    toast.success("Compartilhado com sucesso!");
                } else {
                    // Fallback para WhatsApp
                    const text = encodeURIComponent(`Olá ${client.name}, segue o link do seu comprovante: (Funcionalidade de upload pendente)`);
                    window.open(`https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
                    toast.info("Compartilhamento nativo não suportado. Abrindo WhatsApp.");
                }
            }
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Erro ao gerar o documento.");
        } finally {
            setIsGeneratingPdf(false);
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Gerar Comprovante / Recibo
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center">
                    {/* VISUALIZAÇÃO DO DOCUMENTO (INVOICE) */}
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-[210mm] min-h-[100mm] text-slate-800 text-sm" ref={invoiceRef}>
                        {/* CABEÇALHO */}
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide mb-1">COMPROVANTE DE SERVIÇO</h1>
                                {currentUser.companyName && <div className="text-lg font-semibold">{currentUser.companyName}</div>}
                                {currentUser.companyAddress && <div className="text-slate-500 max-w-[250px]">{currentUser.companyAddress}</div>}
                                {currentUser.companyCnpj && <div className="text-slate-500">CNPJ: {currentUser.companyCnpj}</div>}
                            </div>
                            <div className="text-right">
                                <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-2 inline-block">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data do Serviço</div>
                                    <div className="text-xl font-bold font-mono">{new Date(service.date).toLocaleDateString()}</div>
                                </div>
                                <div className="text-slate-500">Ordem de Serviço</div>
                                <div className="text-lg font-bold text-blue-600">#{service.manualOrderId || 'N/A'}</div>
                            </div>
                        </div>

                        {/* INFO CLIENTE */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cliente</h3>
                                <div className="text-lg font-bold text-slate-900">{client.name}</div>
                                <div className="text-slate-600">{client.phone}</div>
                                <div className="text-slate-600 max-w-[250px]">{client.address}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Solicitante</h3>
                                <div className="text-lg font-semibold text-slate-900">{service.requesterName || client.name}</div>
                            </div>
                        </div>

                        {/* DETALHES SERVIÇO */}
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1">Detalhes do Pedido</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-8 flex flex-col items-center gap-1">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                                        <div className="w-0.5 h-full bg-slate-200"></div>
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Coleta / Origem</div>
                                        {service.pickupAddresses?.map((addr, i) => (
                                            <div key={i} className="mb-1 text-slate-700">{addr}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 flex flex-col items-center gap-1">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1"></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">Entrega / Destino</div>
                                        {service.deliveryAddresses?.map((addr, i) => (
                                            <div key={i} className="mb-1 text-slate-700">{addr}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PAGAMENTO */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                                <span className="font-semibold text-slate-600">Forma de Pagamento</span>
                                <span className="font-bold text-slate-900 uppercase">{service.paymentMethod || 'A Combinar'}</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-slate-600">
                                    <span>Valor do Serviço</span>
                                    <span>R$ {service.cost.toFixed(2)}</span>
                                </div>
                                {service.waitingTime && service.waitingTime > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Tempo de Espera</span>
                                        <span>R$ {service.waitingTime.toFixed(2)}</span>
                                    </div>
                                )}
                                {service.extraFee && service.extraFee > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Taxas Extras</span>
                                        <span>R$ {service.extraFee.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-300">
                                    <span className="text-lg font-bold text-slate-900">Total a Pagar</span>
                                    <span className="text-2xl font-bold text-slate-900">R$ {((service.cost || 0) + (service.waitingTime || 0) + (service.extraFee || 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="text-center text-xs text-slate-400 pt-8 border-t border-slate-100">
                            <p>Documento gerado automaticamente pelo sistema LogiTrackCRM em {new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => generatePDF('download')}
                        disabled={isGeneratingPdf}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        Baixar PDF
                    </button>
                    <button
                        onClick={() => generatePDF('share')}
                        disabled={isGeneratingPdf}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                        Compartilhar
                    </button>
                </div>
            </div>
        </div>
    );
};
