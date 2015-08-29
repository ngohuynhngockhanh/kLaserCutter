#include <cv.h>
#include <highgui.h> 
#include <iostream>
using namespace cv;
using namespace std;
int main( int argc, char** argv ) { 
	char* imageName = argv[1]; 
	Mat image = imread(imageName, 1); 
	if( argc != 2 || !image.data ) {
		cout << "No image data" << endl;
		return -1; 
	}
	cout << image.rows << "x" << image.cols << endl; 
	return 0;
} 