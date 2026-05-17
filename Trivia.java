import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.GridLayout;
import java.awt.FlowLayout;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.Timer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class Trivia extends JPanel implements ActionListener, MouseListener {

    // -------------------------
    // Step 1: State & config
    // -------------------------
    int width = 1280;                 // window width
    int height = 800;                 // window height
    Font titleFont = new Font("Comic Sans MS", Font.BOLD, 32);
    Font questionFont = new Font("Arial", Font.BOLD, 24);
    Font buttonFont = new Font("Arial", Font.BOLD, 20);
    Font statusFont = new Font("Arial", Font.PLAIN, 16);

        // Step 1.1: Questions array (prompt, 4 options, correct letter A-D)
        String[][] questions = new String[][] {
            {"What planet is known as the Red Planet?", "Earth", "Mars", "Venus", "Jupiter", "B"},
            {"What gas do plants absorb from the atmosphere?", "Oxygen", "Hydrogen", "Carbon Dioxide", "Nitrogen", "C"},
            {"What is the chemical symbol for gold?", "Ag", "Au", "Fe", "Go", "B"},
            {"Who was the first president of the United States?", "Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams", "C"},
            {"In what year did World War II end?", "1945", "1939", "1918", "1955", "A"},
            {"Which ancient civilization built the pyramids?", "Romans", "Greeks", "Mayans", "Egyptians", "D"},
            {"How many players are on a soccer team on the field?", "9", "10", "11", "12", "C"},
            {"Which sport uses a shuttlecock?", "Tennis", "Badminton", "Volleyball", "Table Tennis", "B"},
            {"How many points is a touchdown worth in football?", "3", "6", "7", "2", "B"},
            {"Which movie features the character Iron Man?", "Justice League", "Avengers", "Avatar", "Titanic", "B"},
            {"Who is the main wizard in Harry Potter?", "Gandalf", "Merlin", "Dumbledore", "Harry Potter", "D"},
            {"Which movie features talking toys?", "Frozen", "Toy Story", "Cars", "Shrek", "B"},
            {"What is the capital of Japan?", "Beijing", "Tokyo", "Seoul", "Bangkok", "B"},
            {"Which continent is Egypt located in?", "Asia", "Europe", "Africa", "South America", "C"},
            {"Which ocean is the largest?", "Atlantic", "Indian", "Arctic", "Pacific", "D"},
            {"What does CPU stand for?", "Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Computer Processing User", "A"},
            {"Which company created the iPhone?", "Samsung", "Google", "Apple", "Microsoft", "C"},
            {"What language is mainly used for Android app development?", "Java", "Python", "HTML", "Swift", "A"},
            {"How many days are in a leap year?", "364", "365", "366", "367", "C"},
            {"Which animal is known as the king of the jungle?", "Tiger", "Lion", "Elephant", "Bear", "B"},
            {"What color do you get when you mix red and blue?", "Green", "Purple", "Orange", "Yellow", "B"}
        };

        int currentQuestion = 0;          // actual question index in 'questions' array
    int timerSeconds = 15;            // time per question
    int timerRemaining = timerSeconds;
    javax.swing.Timer roundTimer;

        // question ordering (shuffled)
        List<Integer> questionOrder = new ArrayList<>();
        int questionPointer = 0; // position in questionOrder
        Random rand = new Random();

    // UI components (Step 1.2)
    javax.swing.JButton[] optionButtons = new javax.swing.JButton[4];
    javax.swing.JButton nextButton;
    javax.swing.JLabel titleLabel;
    javax.swing.JLabel questionLabel;
    javax.swing.JLabel timerLabel;
    javax.swing.JLabel questionCounterLabel;
    javax.swing.JLabel myScoreLabel;
    javax.swing.JLabel oppScoreLabel;
    javax.swing.JLabel statusLabel;
    javax.swing.Timer advanceTimer; // short delay before next question

    // Player state (local client view) (Step 1.3)
    int myScore = 0;
    int opponentScore = 0; // placeholder for two-player flow
    boolean answered = false; // whether this player has answered current question
    String statusMessage = "Waiting to start...";

    // -------------------------
    // Step 2: Constructor - build UI
    // -------------------------
    public Trivia() {
        // create window and add this panel
        JFrame frame = new JFrame("Two-Player Trivia");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(new Dimension(width, height));

        // Step 2.1: configure this panel with BorderLayout
        this.setLayout(new BorderLayout(10, 10));
        frame.add(this);

        // ensure background
        this.setBackground(Color.WHITE);

        // Top panel: title, timer, scores
        JPanel topPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 20, 10));
        topPanel.setBackground(new Color(30, 80, 160));
        titleLabel = new JLabel("Two-Player Trivia");
        titleLabel.setFont(titleFont);
        titleLabel.setForeground(Color.WHITE);
        timerLabel = new JLabel("Time: " + timerRemaining + "s");
        timerLabel.setFont(statusFont);
        timerLabel.setForeground(Color.WHITE);
        questionCounterLabel = new JLabel("Question: 1 / " + questions.length);
        questionCounterLabel.setFont(statusFont);
        questionCounterLabel.setForeground(Color.WHITE);
        myScoreLabel = new JLabel("You: 0");
        myScoreLabel.setFont(statusFont);
        myScoreLabel.setForeground(Color.WHITE);
        oppScoreLabel = new JLabel("Opponent: 0");
        oppScoreLabel.setFont(statusFont);
        oppScoreLabel.setForeground(Color.WHITE);
        topPanel.add(titleLabel);
        topPanel.add(timerLabel);
        topPanel.add(questionCounterLabel);
        topPanel.add(myScoreLabel);
        topPanel.add(oppScoreLabel);
        this.add(topPanel, BorderLayout.NORTH);

        // Center panel: question + options
        JPanel centerPanel = new JPanel(new BorderLayout(10, 10));
        questionLabel = new JLabel("Q: ");
        questionLabel.setFont(questionFont);
        questionLabel.setOpaque(true);
        questionLabel.setBackground(new Color(220, 240, 255));
        questionLabel.setBorder(javax.swing.BorderFactory.createCompoundBorder(
                javax.swing.BorderFactory.createLineBorder(new Color(100, 150, 220), 2, true),
                javax.swing.BorderFactory.createEmptyBorder(15, 15, 15, 15)));
        centerPanel.add(questionLabel, BorderLayout.NORTH);

        JPanel optionsGrid = new JPanel(new GridLayout(2, 2, 20, 20));
        optionsGrid.setBackground(new Color(230, 245, 255));
        for (int i = 0; i < 4; i++) {
            javax.swing.JButton b = new javax.swing.JButton("Option " + (i + 1));
            b.setFont(buttonFont);
            b.setBackground(new Color(255, 200, 60));
            b.setForeground(Color.DARK_GRAY);
            b.setFocusPainted(false);
            b.setBorderPainted(false);
            final int idx = i; // capture index for simple handler
            b.addActionListener(e -> onOptionClicked(idx));
            optionButtons[i] = b;
            optionsGrid.add(b);
        }
        centerPanel.add(optionsGrid, BorderLayout.CENTER);
        this.add(centerPanel, BorderLayout.CENTER);

        // Bottom panel: status and next
        JPanel bottomPanel = new JPanel(new BorderLayout());
        bottomPanel.setBackground(new Color(245, 245, 255));
        statusLabel = new JLabel(statusMessage);
        statusLabel.setFont(statusFont);
        statusLabel.setBorder(javax.swing.BorderFactory.createEmptyBorder(10, 10, 10, 10));
        bottomPanel.add(statusLabel, BorderLayout.WEST);
        nextButton = new javax.swing.JButton("Next Question");
        nextButton.setFont(buttonFont);
        nextButton.setBackground(new Color(80, 180, 110));
        nextButton.setForeground(Color.WHITE);
        nextButton.setFocusPainted(false);
        nextButton.setBorderPainted(false);
        nextButton.addActionListener(e -> nextQuestion());
        bottomPanel.add(nextButton, BorderLayout.EAST);
        this.add(bottomPanel, BorderLayout.SOUTH);

        // Step 2.4: create the per-question timer and short advance timer
        roundTimer = new javax.swing.Timer(1000, e -> timerTick());
        advanceTimer = new javax.swing.Timer(1500, e -> {
            ((javax.swing.Timer)e.getSource()).stop();
            nextQuestion();
        });

        // Step 2.5: show window
        frame.setVisible(true);

        // Step 2.6: initialize and shuffle question order, then start first question
        initQuestionOrder();
        questionPointer = 0;
        startQuestion(questionOrder.get(questionPointer));
    }

    // -------------------------
    // Step 3: Paint UI (question, timer, scores)
    // -------------------------
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        // background color is set on the panel; no custom painting required
    }

    // -------------------------
    // Step 4: Timer & question lifecycle
    // -------------------------
    void startQuestion(int index) {
        // record which actual question we're showing (index into questions[])
        currentQuestion = index;
        // Step 4.1: load question text into option buttons
        String[] q = questions[index];
        for (int i = 0; i < 4; i++) {
            optionButtons[i].setText(q[1 + i]);
            optionButtons[i].setEnabled(true);
        }
        answered = false;
        timerRemaining = timerSeconds;
        statusMessage = "Answer the question";
        // update labels
        questionLabel.setText("Q: " + q[0]);
        timerLabel.setText("Time: " + timerRemaining + "s");
        questionCounterLabel.setText("Question: " + (questionPointer + 1) + " / " + questions.length);
        statusLabel.setText(statusMessage);
        statusLabel.setForeground(Color.DARK_GRAY);
        myScoreLabel.setText("You: " + myScore);
        oppScoreLabel.setText("Opponent: " + opponentScore);
        nextButton.setEnabled(false);
        roundTimer.start();
    }

    // initialize and shuffle the question order list
    void initQuestionOrder() {
        questionOrder.clear();
        for (int i = 0; i < questions.length; i++) questionOrder.add(i);
        Collections.shuffle(questionOrder, rand);
    }

    void timerTick() {
        timerRemaining--;
        if (timerRemaining <= 0) {
            roundTimer.stop();
            // treat as no answer
            onPlayerAnswer(-1);
        }
        timerLabel.setText("Time: " + timerRemaining + "s");
        repaint();
    }

    // -------------------------
    // Step 5: Handle option clicks and answer submission
    // -------------------------
    void handleOption(String actionCommand) {
        if (answered) return; // ignore additional clicks
        if (!actionCommand.startsWith("OPTION_")) return;
        int idx = Integer.parseInt(actionCommand.substring("OPTION_".length()));
        // mark answered and disable buttons
        for (javax.swing.JButton b : optionButtons) b.setEnabled(false);
        answered = true;
        roundTimer.stop();
        onPlayerAnswer(idx);
    }

    // simpler handler used by UI buttons
    void onOptionClicked(int idx) {
        if (answered) return;
        for (javax.swing.JButton b : optionButtons) b.setEnabled(false);
        answered = true;
        roundTimer.stop();
        onPlayerAnswer(idx);
    }

    void onPlayerAnswer(int selectedIndex) {
        // Step 5.1: local evaluation (in a real two-player game this is done on the server)
        String correctLetter = questions[currentQuestion][5];
        int correctIndex = Character.toUpperCase(correctLetter.charAt(0)) - 'A';
        if (selectedIndex == correctIndex) {
            myScore++;
            statusMessage = "You answered correctly!";
        } else if (selectedIndex == -1) {
            statusMessage = "Time expired! Correct: " + (char)('A' + correctIndex);
        } else {
            statusMessage = "Wrong answer. Correct: " + (char)('A' + correctIndex);
        }

        // Step 5.2: placeholder - send answer to server here
        // sendToServer("ANSWER:" + selectedIndex);

        // update labels
        statusLabel.setText(statusMessage);
        myScoreLabel.setText("You: " + myScore);
        oppScoreLabel.setText("Opponent: " + opponentScore);
        nextButton.setEnabled(true);
        if (selectedIndex == correctIndex) {
            statusLabel.setForeground(new Color(10, 120, 20));
        } else {
            statusLabel.setForeground(new Color(180, 20, 20));
        }

        // auto-advance after a short delay
        if (advanceTimer.isRunning()) advanceTimer.stop();
        advanceTimer.start();
    }

    // -------------------------
    // Step 6: Next question (advance local prototype)
    // -------------------------
    void nextQuestion() {
        questionPointer++;
        if (questionPointer >= questionOrder.size()) {
            statusMessage = "Game over. Final score: " + myScore + " - " + opponentScore;
            for (javax.swing.JButton b : optionButtons) b.setEnabled(false);
            nextButton.setEnabled(false);
            statusLabel.setText(statusMessage);
            repaint();
            return;
        }
        startQuestion(questionOrder.get(questionPointer));
    }

    // -------------------------
    // Step 7: Networking placeholders
    // -------------------------
    // In a real implementation you would open a Socket and send/receive simple
    // text messages. Example placeholder methods are shown below.
    void sendToServer(String msg) {
        // TODO: implement socket send
        System.out.println("[to server] " + msg);
    }

    void receiveFromServer(String msg) {
        // TODO: handle incoming messages such as QUESTION, RESULT, OPPONENT_ANSWER
        // Example: parse and update opponent score or trigger nextQuestion
    }

    // -------------------------
    // Required listener methods
    // -------------------------
    @Override
    public void actionPerformed(ActionEvent e) {
        // not used (we use specific listeners and the roundTimer)
    }

    @Override
    public void mouseClicked(MouseEvent e) {}

    @Override
    public void mouseEntered(MouseEvent e) {}

    @Override
    public void mouseExited(MouseEvent e) {}

    @Override
    public void mousePressed(MouseEvent e) {}

    @Override
    public void mouseReleased(MouseEvent e) {}

    // -------------------------
    // Step 8: Launcher
    // -------------------------
    public static void main(String[] args) {
        // Start the local prototype client. In production this would connect to server.
        javax.swing.SwingUtilities.invokeLater(() -> new Trivia());
    }
}                                                           