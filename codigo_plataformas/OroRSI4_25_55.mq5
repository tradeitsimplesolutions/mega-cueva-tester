//+------------------------------------------------------------------+
//| OroRSI4_25_55.mq5 — Trade It Simple (demo MEGA CUEVA TESTER)     |
//|                                                                  |
//| XAUUSD D1 · solo largos · una posición a la vez                  |
//|  1. Filtro: cierre de ayer > SMA(200)                            |
//|  2. Entrada: RSI(4) de ayer < 25  -> compra a mercado al abrir   |
//|  3. Salida:  RSI(4) de ayer > 55  -> cierra a mercado al abrir   |
//|                                                                  |
//| Se evalúa UNA vez, en el primer tick de cada vela D1 nueva,      |
//| con los datos de la vela recién cerrada (índice 1).              |
//| iRSI con PRICE_CLOSE usa la media de Wilder, igual que Sentinel. |
//+------------------------------------------------------------------+
#property copyright "Trade It Simple"
#property version   "1.00"
#property description "Oro RSI(4) 25/55: reversión a la media dentro de tendencia (SMA200)."

#include <Trade\Trade.mqh>

//--- Modo de tamaño de la posición
enum ENUM_MODO_LOTE
  {
   LOTE_PCT_EQUITY = 0, // % del equity (100 = todo el capital, sin apalancar)
   LOTE_FIJO       = 1  // Lotes fijos
  };

//--- Parámetros
input group "Reglas"
input int             InpRSIPeriodo  = 4;          // Periodo del RSI
input double          InpRSIEntrada  = 25.0;       // Compra si RSI < este nivel
input double          InpRSISalida   = 55.0;       // Vende si RSI > este nivel
input int             InpSMAPeriodo  = 200;        // Media simple de tendencia
input ENUM_TIMEFRAMES InpMarco       = PERIOD_D1;  // Marco temporal de la señal

input group "Tamaño"
input ENUM_MODO_LOTE  InpModoLote    = LOTE_PCT_EQUITY; // Cómo se calcula el lotaje
input double          InpPctEquity   = 100.0;      // % del equity en nocional (modo %)
input double          InpLotesFijos  = 0.10;       // Lotes (modo fijo)

input group "Riesgo y ejecución"
input double          InpStopPct     = 0.0;        // Stop de emergencia en % bajo la entrada (0 = sin stop)
input ulong           InpMagic       = 20261007;   // Número mágico
input int             InpDesvioPts   = 50;         // Desvío máximo en puntos

//--- Variables globales
CTrade   trade;
int      hRSI = INVALID_HANDLE;
int      hSMA = INVALID_HANDLE;
datetime velaProcesada = 0;

//+------------------------------------------------------------------+
int OnInit()
  {
   hRSI = iRSI(_Symbol, InpMarco, InpRSIPeriodo, PRICE_CLOSE);
   hSMA = iMA(_Symbol, InpMarco, InpSMAPeriodo, 0, MODE_SMA, PRICE_CLOSE);
   if(hRSI == INVALID_HANDLE || hSMA == INVALID_HANDLE)
     {
      Print("No se pudieron crear los indicadores");
      return(INIT_FAILED);
     }
   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpDesvioPts);
   trade.SetTypeFillingBySymbol(_Symbol);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(hRSI != INVALID_HANDLE) IndicatorRelease(hRSI);
   if(hSMA != INVALID_HANDLE) IndicatorRelease(hSMA);
  }

//+------------------------------------------------------------------+
//| Ticket de nuestra posición abierta (0 si no hay)                 |
//+------------------------------------------------------------------+
ulong PosicionAbierta()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) == _Symbol &&
         (ulong)PositionGetInteger(POSITION_MAGIC) == InpMagic)
         return(ticket);
     }
   return(0);
  }

//+------------------------------------------------------------------+
//| Lotaje según el modo elegido                                     |
//+------------------------------------------------------------------+
double CalcularLotes(const double precio)
  {
   double paso   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minimo = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maximo = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotes  = InpLotesFijos;

   if(InpModoLote == LOTE_PCT_EQUITY)
     {
      // Valor nocional de 1 lote en la divisa de la cuenta
      double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
      double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      if(tickVal <= 0 || tickSize <= 0) return(0);
      double nocionalLote = precio / tickSize * tickVal;
      double objetivo     = AccountInfoDouble(ACCOUNT_EQUITY) * InpPctEquity / 100.0;
      lotes = objetivo / nocionalLote;
     }

   // Redondear al paso del símbolo (hacia abajo) y acotar
   lotes = MathFloor(lotes / paso) * paso;
   if(lotes > maximo) lotes = maximo;

   // No pedir más margen del que hay libre
   double margen = 0.0;
   while(lotes >= minimo &&
         OrderCalcMargin(ORDER_TYPE_BUY, _Symbol, lotes, precio, margen) &&
         margen > AccountInfoDouble(ACCOUNT_MARGIN_FREE))
      lotes -= paso;

   if(lotes < minimo) return(0);
   return(NormalizeDouble(lotes, 2));
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   // Solo una vez por vela nueva del marco de la señal
   datetime velaActual = iTime(_Symbol, InpMarco, 0);
   if(velaActual == 0 || velaActual == velaProcesada) return;
   if(Bars(_Symbol, InpMarco) < InpSMAPeriodo + 2) return;

   // Datos de la vela recién cerrada (índice 1)
   double rsi[1], sma[1];
   if(CopyBuffer(hRSI, 0, 1, 1, rsi) != 1) return;
   if(CopyBuffer(hSMA, 0, 1, 1, sma) != 1) return;
   double cierre = iClose(_Symbol, InpMarco, 1);
   if(cierre <= 0) return;

   bool  hecho  = true;
   ulong ticket = PosicionAbierta();

   if(ticket > 0)
     {
      // --- Salida: RSI(4) > 55
      if(rsi[0] > InpRSISalida)
        {
         hecho = trade.PositionClose(ticket);
         if(hecho) PrintFormat("SALIDA RSI=%.1f > %.0f", rsi[0], InpRSISalida);
        }
     }
   else
     {
      // --- Entrada: cierre > SMA200 y RSI(4) < 25
      if(cierre > sma[0] && rsi[0] < InpRSIEntrada)
        {
         double ask   = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double lotes = CalcularLotes(ask);
         if(lotes <= 0)
           {
            Print("Lotaje calculado = 0: revisa el equity o el modo de tamaño");
           }
         else
           {
            double sl = 0.0;
            if(InpStopPct > 0)
               sl = NormalizeDouble(ask * (1.0 - InpStopPct / 100.0), _Digits);
            hecho = trade.Buy(lotes, _Symbol, 0.0, sl, 0.0, "OroRSI4 25/55");
            if(hecho) PrintFormat("ENTRADA RSI=%.1f < %.0f · cierre %.2f > SMA %.2f · %.2f lotes",
                                  rsi[0], InpRSIEntrada, cierre, sma[0], lotes);
           }
        }
     }

   // Si la orden falló (mercado cerrado, requote...) se reintenta en el siguiente tick
   if(hecho) velaProcesada = velaActual;
   else      PrintFormat("Orden rechazada (%d): se reintenta", trade.ResultRetcode());
  }
//+------------------------------------------------------------------+
