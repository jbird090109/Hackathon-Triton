import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.GridLayout;
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
import javax.swing.JPanel;
import javax.swing.Timer;

public class Frame extends JPanel implements ActionListener, MouseListener, KeyListener {
	
	//Timer related variables
	int waveTimer = 5; //each wave of enemies is 20s
	long ellapseTime = 0;
	Font timeFont = new Font("Courier", Font.BOLD, 20);
	int level = 0;
	
	
	Font myFont = new Font("Courier", Font.BOLD, 40);
	//SimpleAudioPlayer backgroundMusic = new SimpleAudioPlayer("scifi.wav", false);
	//	Music soundBang = new Music("bang.wav", false);
	//	Music soundHaha = new Music("haha.wav", false);

	//frame width/height
	int width = 2560;
	int height = 1440;	
	
	
	//1 object example
	//Bat bat = new Bat(100, 100);
	
	//multiple objects! - for a row of obstacles
	//Bat[] batRow = new Bat[10];
	
	/* paint the objects */
	public void paint(Graphics g) {
		super.paintComponent(g);
		g.drawRect(100, 100, 200, 200);
		
	}
	
	
	public static void main(String[] arg) {
		Frame f = new Frame();
	}
	
	public Frame() {
		JFrame f = new JFrame("chatgpt i think");
		f.setSize(new Dimension(width, height));
		f.setBackground(Color.black);
		f.add(this);
		f.setResizable(false);
 		f.addMouseListener(this);
		f.addKeyListener(this);

		//backgroundMusic.play();

		//The constructor for Frame should init the objects before
		//the frame is displayed
		
		//batrow - create the objects
//		for(int i = 0; i < batRow.length; i++) {
//			
//			//create a new bat each iteration, assign it to a pos
//			batRow[i] = new Bat(i*100+20, 100);
//			
//		}
		
		
		
		
	
		
		//the cursor image must be outside of the src folder
		//you will need to import a couple of classes to make it fully 
		//functional! use eclipse quick-fixes
		setCursor(Toolkit.getDefaultToolkit().createCustomCursor(
				new ImageIcon("cursor2.png").getImage(),
				new Point(0,0),"custom cursor"));	
		
		
		Timer t = new Timer(16, this);
		t.start();
		f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		f.setVisible(true);
	}
	
	
	@Override
	public void mouseClicked(MouseEvent arg0) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void mouseEntered(MouseEvent arg0) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void mouseExited(MouseEvent arg0) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void mousePressed(MouseEvent m) {
		
	
		
	}

	@Override
	public void mouseReleased(MouseEvent arg0) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void actionPerformed(ActionEvent arg0) {
		if (arg0.getSource() instanceof Timer) {
			


		repaint();
		}
	}

	@Override
	public void keyPressed(KeyEvent arg0) {
	
		
	}

	@Override
	public void keyReleased(KeyEvent arg0) {
		
	}

	@Override
	public void keyTyped(KeyEvent arg0) {
		// TODO Auto-generated method stub
		
	}

}