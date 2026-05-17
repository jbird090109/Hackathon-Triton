import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.Timer;

public class DrawerClient extends JPanel implements ActionListener, MouseListener, MouseMotionListener, Runnable {
    private static final int WIDTH = 1600;
    private static final int HEIGHT = 900;

    private final List<Point> points = new ArrayList<>();
    private boolean drawing = false;
    private boolean drawingEnabled = true;
    private int timer = 30;
    private long lastSecond = System.currentTimeMillis();

    private String currentPrompt = "Waiting for prompt...";
    private String statusMessage = "Waiting for game to start";

    private final Rectangle clearButton = new Rectangle(50, 750, 180, 60);
    private final Rectangle submitButton = new Rectangle(260, 750, 180, 60);

    private Socket socket;
    private PrintWriter out;
    private BufferedReader in;

    public DrawerClient(String host, int port) {
        //connectToServer(host, port);

        JFrame frame = new JFrame("Drawer Client");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(new Dimension(WIDTH, HEIGHT));
        frame.add(this);
        frame.addMouseListener(this);
        frame.addMouseMotionListener(this);
        frame.setResizable(false);
        frame.setVisible(true);

        Timer timerLoop = new Timer(16, this);
        timerLoop.start();

        new Thread(this).start();
    }

    private void connectToServer(String host, int port) {
        try {
            socket = new Socket(host, port);
            out = new PrintWriter(socket.getOutputStream(), true);
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            statusMessage = "Connected to server";
        } catch (IOException e) {
            e.printStackTrace();
            statusMessage = "Unable to connect to server";
        }
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);

        g.setColor(Color.WHITE);
        g.fillRect(0, 0, WIDTH, HEIGHT);

        g.setColor(Color.BLACK);
        g.setFont(new Font("Arial", Font.BOLD, 40));
        g.drawString("Drawer", 40, 60);

        g.setFont(new Font("Arial", Font.BOLD, 30));
        g.drawString("Prompt: " + currentPrompt, 40, 120);
        g.drawString("Time: " + timer, 40, 170);

        g.setColor(drawingEnabled ? Color.GREEN : Color.RED);
        g.drawString(drawingEnabled ? "DRAW!" : "WAIT...", 500, 170);

        g.setColor(Color.BLACK);
        g.drawRect(40, 200, 1000, 500);

        g.setColor(Color.BLACK);
        for (Point p : points) {
            g.fillOval(p.x, p.y, 8, 8);
            //System.out.println("drawing point at " + p.x + ", " + p.y);
        }

        g.setColor(Color.RED);
        g.fillRect(clearButton.x, clearButton.y, clearButton.width, clearButton.height);

        g.setColor(Color.BLUE);
        g.fillRect(submitButton.x, submitButton.y, submitButton.width, submitButton.height);

        g.setColor(Color.WHITE);
        g.setFont(new Font("Arial", Font.BOLD, 25));
        g.drawString("CLEAR", 90, 790);
        g.drawString("SUBMIT", 290, 790);

        g.setColor(Color.BLACK);
        g.setFont(new Font("Arial", Font.PLAIN, 24));
        g.drawString(statusMessage, 40, 860);
    }

    @Override
    public void actionPerformed(ActionEvent e) {



        if (drawingEnabled) {
            if (System.currentTimeMillis() - lastSecond >= 1000) {
                timer--;
                lastSecond = System.currentTimeMillis();
                if (timer <= 0) {
                    drawingEnabled = false;
                    sendMessage("TIME_UP");
                }
            }
        }
        repaint();
    }

    @Override
    public void mousePressed(MouseEvent e) {
        Point click = e.getPoint();
System.out.println("Mouse pressed at " + click.x + ", " + click.y);
//System.out.println(drawingEnabled);


        if (clearButton.contains(click)) {
            points.clear();
            System.out.println("Let me be perfectly clear");
            sendMessage("CLEAR");
        } else if (submitButton.contains(click)) {
            drawingEnabled = false;
            sendMessage("SUBMIT");
            statusMessage = "Submitted drawing, waiting for judge";
        } else if (drawingEnabled && click.x >= 40 && click.x <= 1040 && click.y >= 200 && click.y <= 700) {
            //System.out.println("yeah");
            drawing = true;
        }
    }

    @Override
    public void mouseReleased(MouseEvent e) {
        drawing = false;
    }

    @Override
    public void mouseDragged(MouseEvent e) {
        if (drawing && drawingEnabled && e.getX() >= 40 && e.getX() <= 1040 && e.getY() >= 200 && e.getY() <= 700) {
            Point p = new Point(e.getX(), e.getY());
            points.add(p);
            sendMessage("DRAW:" + p.x + "," + p.y);
        }
    }

    private void sendMessage(String message) {
        if (out != null) {
            out.println(message);
        }
    }

    @Override
    public void run() {
        try {
            String line;
            while ((line = in.readLine()) != null) {
                handleServerMessage(line);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void handleServerMessage(String message) {
        if (message.startsWith("PROMPT:")) {
            currentPrompt = message.substring("PROMPT:".length());
            statusMessage = "Round started";
        } else if (message.equals("START")) {
            timer = 30;
            lastSecond = System.currentTimeMillis();
            drawingEnabled = true;
            points.clear();
            statusMessage = "Draw now";
        } else if (message.equals("STOP")) {
            drawingEnabled = false;
            statusMessage = "Time is up";
        } else if (message.startsWith("RESULT:")) {
            statusMessage = "Result: " + message.substring("RESULT:".length());
        }
        repaint();
    }

    @Override public void mouseClicked(MouseEvent e) {}
    @Override public void mouseMoved(MouseEvent e) {}
    @Override public void mouseEntered(MouseEvent e) {}
    @Override public void mouseExited(MouseEvent e) {}

    public static void main(String[] args) {
        new DrawerClient("localhost", 5000);
    }
}