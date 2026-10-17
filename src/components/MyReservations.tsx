import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, History, CheckCircle2, Clock, Phone, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sale, SiteSettings } from '../types';

const MyReservations = ({ sales, onClose, settings, onCallUs }: { sales: Sale[]; onClose: () => void; settings: SiteSettings; onCallUs: () => void }) => {
  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="px-6 py-8 border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold uppercase tracking-widest text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar à Loja
          </button>
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">Minhas Reservas</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {sales.length === 0 ? (
          <div className="text-center py-20 glass rounded-[40px] bg-white">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <History className="w-10 h-10 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma reserva encontrada</h2>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Você ainda não realizou nenhuma reserva em nossa loja.</p>
            <button 
              onClick={onClose}
              className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary transition-all shadow-lg"
            >
              Começar a comprar
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sales.map((reservation) => (
              <motion.div 
                key={reservation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[32px] overflow-hidden bg-white border-zinc-200 shadow-sm"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Reserva #{reservation.id.slice(-6).toUpperCase()}</div>
                      <div className="text-xs text-zinc-500">{format(new Date(reservation.createdAt), 'dd "de" MMMM "de" yyyy, HH:mm', { locale: ptBR })}</div>
                      {reservation.customerProvince && (
                        <div className="text-[10px] text-orange-600 font-bold uppercase mt-1">
                          Província: {reservation.customerProvince}
                          {reservation.customerNeighborhood && ` • Bairro: ${reservation.customerNeighborhood}`}
                          {reservation.customerAddress && ` • Endereço/Ref: ${reservation.customerAddress}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {reservation.status === 'paid' ? (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-400/10 text-emerald-600 text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pago
                        </span>
                      ) : reservation.status === 'cancelled' ? (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-400/10 text-red-600 text-xs font-bold uppercase tracking-widest border border-red-500/20">
                          <X className="w-3.5 h-3.5" />
                          Cancelado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-400/10 text-orange-600 text-xs font-bold uppercase tracking-widest border border-orange-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reservation.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-zinc-50 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center font-bold text-zinc-400 border border-zinc-100">
                            {item.quantity}x
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{item.productName}</div>
                            <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{item.variation.color} / {item.variation.size}</div>
                          </div>
                        </div>
                        <div className="font-bold text-zinc-900">
                          KZ {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Total da Reserva</span>
                    <span className="text-2xl font-bold text-zinc-900" style={{ color: settings.primaryColor }}>
                      KZ {reservation.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {reservation.status === 'pending' && (
                  <button 
                    onClick={onCallUs}
                    className="w-full px-8 py-4 bg-orange-50 border-t border-orange-100 italic transition-all hover:bg-orange-100 group"
                  >
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider text-center group-hover:scale-105 transition-transform flex items-center justify-center gap-2">
                      <Phone className="w-3 h-3" />
                      Pagamento feito na entrega, Ligue para nós
                    </p>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};


export default MyReservations;
