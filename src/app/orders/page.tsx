import AppHeader from '@/components/AppHeader';

export default function Orders() {
  return (
    <>
      <AppHeader showSearch={false} />

      <main className="px-gutter pt-6 flex flex-col gap-lg pb-10">
        <h1 className="font-h2 text-[22px] font-black text-[#3E2723] tracking-tight">Mis Pedidos</h1>
        {/* Active Order Section */}
        <section>
          <h2 className="font-h2 text-[20px] text-[#3E2723] mb-4">Pedido Activo</h2>
          <div className="bg-surface-container-lowest rounded-[24px] shadow-[0_8px_30px_rgba(62,39,35,0.08)] p-5 border border-[#E2725B]/5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-h3 text-[18px] text-[#3E2723] font-bold">Artisan Bakery Delivery</h3>
                <p className="font-body-md text-[14px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span> Llega en ~15 mins
                </p>
              </div>
              <div className="bg-[#E2725B]/10 text-[#E2725B] p-3 rounded-full shadow-sm">
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_boat</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative w-full h-[6px] bg-surface-variant rounded-full overflow-hidden mb-3">
              <div className="absolute top-0 left-0 h-full bg-[#E2725B] rounded-full w-2/3"></div>
            </div>
            <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider">
              <span className="text-on-surface-variant/60">Preparando</span>
              <span className="text-[#E2725B]">En camino</span>
              <span className="text-on-surface-variant/60">Entregado</span>
            </div>
          </div>
        </section>

        {/* History Section */}
        <section className="flex flex-col gap-4">
          <h2 className="font-h2 text-[20px] text-[#3E2723]">Historial</h2>
          <div className="flex flex-col gap-3">
            {/* History Item 1 */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 shadow-sm">
                  <img alt="Coffee" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDx-eVxGRbe-exffTF_Bc6_IRvKavCYXD2eBjoC3780fqjQW_-E0IHbVHDunues2kF4bOjEDRKKrda0ZCo9axM9f3z6mvZbWDVFYAi4qgtNLtly-dRHthzKDRGeMnO2fH1iFI--4Q_A0Ikm9b5uGbcBqUVmgB_wfKJHA97vigyu3AJ3i1cmS3t30XTPSbiUjlu9Tkb9IC6AEbwUTGlaSiOBMtWMpnGOrsNJWPESFQrtLGNNM6FWOHAiS9feWmmJfYwvoGLOzSMnL7md" />
                </div>
                <div>
                  <h4 className="font-label-md text-[15px] text-[#3E2723] font-bold">The Local Roaster</h4>
                  <p className="text-[12px] text-on-surface-variant">24 Oct • S/ 12.50</p>
                </div>
              </div>
              <button className="bg-[#E2725B]/5 text-[#E2725B] hover:bg-[#E2725B] hover:text-white transition-all font-label-md text-[12px] px-4 py-2 rounded-full font-bold whitespace-nowrap active:scale-95">
                Repetir
              </button>
            </div>

            {/* History Item 2 */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 shadow-sm">
                  <img alt="Salad" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDt_yu0O5CfjJvExHU9FKB8I-LHwhwZtJlg67YLUf4R_KSzyj2uY1ty5c0KjX-sJeGbfKnVhqZ9vCmT8b1_VYppeuzmNshVV-rnz29hLJMngPXkdeEU_PsWlmtT0-RGnBETTNm51ifxaVaJ_ylIgZQkFGKS2Gv2I_Xey7GoudDFR4a8NmYpGzbm3ez1F8iNYXZToss4kjLbXBErEKeWcA1Z_RdCM2FzCDLNY-V-29u4RPMK4pKNmJSevdvLmdWIucHjvXHpnLMb26oB" />
                </div>
                <div>
                  <h4 className="font-label-md text-[15px] text-[#3E2723] font-bold">Green Bowl Co.</h4>
                  <p className="text-[12px] text-on-surface-variant">22 Oct • S/ 18.00</p>
                </div>
              </div>
              <button className="bg-[#E2725B]/5 text-[#E2725B] hover:bg-[#E2725B] hover:text-white transition-all font-label-md text-[12px] px-4 py-2 rounded-full font-bold whitespace-nowrap active:scale-95">
                Repetir
              </button>
            </div>

            {/* History Item 3 */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 shadow-sm">
                  <img alt="Burger" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5l1M3MuUMfOb_espbzzNUJ_Zoqgiz7wvEUmqeTiDYq0Wc-YRImFrrm1KuvI5zrf-HFKUfJ5B-2DGUQAadnhxJAcUTpvFXi7035XZyesEcHi3o6ci7nVmr4fnW7pzBe-2_3RMNtelAyMUtgvpDb0t_d0cXLhXgnMTg45SNax-pLJ3sxO71zgkD5a0-TR4Hr-Twcm-o_IYAn30L3VnQa4KjQ-90TDqnupLJD8CSFp-Dqs-2cSxHHJhiyy8SCb6_wD9RCxLTRGM-NYY7" />
                </div>
                <div>
                  <h4 className="font-label-md text-[15px] text-[#3E2723] font-bold">Urban Burger</h4>
                  <p className="text-[12px] text-on-surface-variant">18 Oct • S/ 24.50</p>
                </div>
              </div>
              <button className="bg-[#E2725B]/5 text-[#E2725B] hover:bg-[#E2725B] hover:text-white transition-all font-label-md text-[12px] px-4 py-2 rounded-full font-bold whitespace-nowrap active:scale-95">
                Repetir
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
