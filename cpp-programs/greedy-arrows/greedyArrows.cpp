#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int greedyArrows(vector<vector<int>>& points) {
// base case, where points = 0
	if (points.empty()) {
// return 0 arrows as there are no balloons to pop
		return 0;
	}

// sorting arrows in ascending order using sort() from the algorithm library
// .begin and .end signify start and end points of our data (points)
// to get sort() to sort our balloons in the wanted way, I think a lambda function
// will suffice in creating a custom comparator, as the normal method sort uses will not achieve
// the wanted results
	sort(points.begin(), points.end(), [](const auto &a, const auto &b) { //const auto a&/b& allows us to capture the data type automatically (vector<int>)
		return a[1] < b[1]; //[1] signifies the end coordinate (xend) of the two ballows, where < sorts in ascending order
	});

// basic initalization and current position
	int arrows = 1;
	int currentPosition = points[0][1]; //place inital arrow position at the END of the first balloon

// iterate over each balloon
	for (int i = 1; i < points.size(); i++) {
		int xstart = points[i][0]; //places start at the first balloon, should iterate correctly as i increases
		int xend = points[i][1];

// need to check if current balloon starts after current position of the arrow
// if so, need to fire another arrow
		if (xstart > currentPosition) {
			arrows++;
			currentPosition = xend; // placing currentPosition at end of next balloon, in attempt to pop more than one at once
		}
	}
// otherwise we don't need to do anything because the current arrow position pops the current balloon
	return arrows;
}


int main() {
// example for testing/grading
// current example has three balloons that fully overlap
	vector<vector<int>> balloons = {{1,3},{2,4},{2,3}};
	cout << "min number of arrows required: " << greedyArrows(balloons) << endl;


	return 0;
}