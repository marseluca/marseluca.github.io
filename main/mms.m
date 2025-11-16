clear; clc; close all;

% Esempio di dati (sostituisci con i tuoi)
t = linspace(0,15,1000);          % tempo [s]
x = 0.5 + 0.5*sin(2*pi*0.2*t);    % posizione della massa (esempio)

% Setup figura
figure('Color','w');
axis([0 2 -0.3 0.3]);
grid on;
xlabel('Posizione [m]');
title('Animazione Massa-Molla-Smorzatore');
hold on;

% Punto di equilibrio (ad esempio 0.5)
x_eq = 0.5;
xline(x_eq,'r--','Equilibrio','LabelOrientation','horizontal',...
    'LabelVerticalAlignment','bottom');

% Parete fissa a sinistra
plot([0 0],[-0.2 0.2],'k','LineWidth',4);

% Avvia animazione
tic;
for i = 1:length(t)
    current_time = toc;
    if current_time < t(i)
        pause(t(i) - current_time); % sincronizza col tempo reale
    end
    
    cla; % cancella contenuto per ridisegnare
    
    % Reimposta ambiente grafico
    axis([0 2 -0.3 0.3]);
    grid on; hold on;
    xline(x_eq,'r--','Equilibrio','LabelOrientation','horizontal',...
        'LabelVerticalAlignment','bottom');
    plot([0 0],[-0.2 0.2],'k','LineWidth',4);
    
    % Disegna molla
    line([0 x(i)], [0 0], 'Color','g', 'LineWidth',2);
    
    % Disegna massa (rettangolo blu centrato su x(i))
    rectangle('Position',[x(i)-0.05, -0.05, 0.2, 0.2],...
        'FaceColor','b','EdgeColor','k');
    
    % Aggiorna titolo con tempo
    title(sprintf('Tempo: %.2f s', t(i)));
    
    drawnow;
end
