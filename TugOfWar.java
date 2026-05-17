import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.Rectangle;
import java.awt.Toolkit;
import java.awt.geom.AffineTransform;
import java.net.URL;

public class TugOfWar{
	private Image forward, backward, left, right; 	
	private AffineTransform tx;
	
	int dir = 0;
	int width, height;
	int x, y;
	int vx, vy;
	double scaleWidth = 2;
	double scaleHeight = 2;
	Rectangle hitbox;
	
	
	public TugOfWar() {
		forward = getImage("/imgs/" + "Rope.png");

		x = 0;
		y = 0;
		vx = 0;
		vy = 0;
		width = 56;
		height= 120;
		tx = AffineTransform.getTranslateInstance(0, 0);
		
		init(x, y);
	}
	
	public TugOfWar(int x, int y) {
		this();
		this.x = x;
		this.y = y;
		
		init(x,y);
	}
	
	public int getVx() {
		return vx;
	}
	
	public void setVx(int x) {
		vx = x;
	}
	public void setVy(int y) {
		vy = y;
	}
	public int getX() {
		return x;
	}
	public int getY() {
		return y;
	}

	public void paint(Graphics g) {
		Graphics2D g2 = (Graphics2D) g;

		x+=vx;
		y+=vy;	
		hitbox.setFrame((x+scaleWidth*0.5*35),y, width *scaleWidth*0.5, height *scaleHeight*0.5);
				init(x,y);
				
		g2.drawImage(forward, tx, null);
		
		switch(dir) {
		case 0:
			g2.drawImage(forward, tx, null);
			break;
		case 1:
			g2.drawImage(backward, tx, null);

			break;
		case 2:
			g2.drawImage(left, tx, null);

			break;
		case 3:
			g2.drawImage(right, tx, null);
			break;
		}

	}
	
	private void init(double a, double b) {
		tx.setToTranslation(a, b);
		tx.scale(scaleWidth, scaleHeight);
	}
		
	private Image getImage(String path) {
		Image tempImage = null;
		try {
			URL imageURL = TugOfWar.class.getResource(path);
			tempImage = Toolkit.getDefaultToolkit().getImage(imageURL);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return tempImage;
	}

}
